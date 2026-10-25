/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, signOut } from 'firebase/auth';
import {
  doc, collection, onSnapshot, setDoc, updateDoc,
  deleteDoc, runTransaction, getDocs, getDoc, query, orderBy, limit
} from 'firebase/firestore';
import { auth, db, testConnection, handleFirestoreError, OperationType, checkRedirectResult } from './lib/firebase';
import {
  Room, Participant, TeamState, Player, ChatMessage, AuctionRules,
  AcquiredPlayer, LiveAuctionState
} from './types';
import { IPL_TEAMS, getTeamById } from './data/teams';
import { INITIAL_PLAYER_POOL, IPL_2026_OFFICIAL_RETAINED_ROSTERS } from './data/players';
import { OFFICIAL_RULES_PRESETS, getNextBidAmount, validateBid } from './utils/rulesEngine';
import { evaluateBotBid, evaluateBotRtm } from './utils/aiBidder';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { CreateOrJoinModal } from './components/CreateOrJoinModal';
import { LobbyView } from './components/LobbyView';
import { RetentionView } from './components/RetentionView';
import { LiveAuctionView } from './components/LiveAuctionView';
import { SquadDashboardModal } from './components/SquadDashboardModal';
import { PlayerManagementModal } from './components/PlayerManagementModal';
import { AuctionResultsView } from './components/AuctionResultsView';
import { Trophy, RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateJoinModal, setShowCreateJoinModal] = useState(false);
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  // Active Room State
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teamStates, setTeamStates] = useState<TeamState[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [playerPool, setPlayerPool] = useState<Player[]>(INITIAL_PLAYER_POOL);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Phone Theme State (default true for authentic mobile-first phone theme)
  const [isPhoneTheme, setIsPhoneTheme] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ipl_phone_theme');
      if (saved !== null) return saved === 'true';
      return true; // Default to phone theme
    }
    return true;
  });

  const handleTogglePhoneTheme = () => {
    setIsPhoneTheme((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ipl_phone_theme', String(next));
      } catch {}
      return next;
    });
  };

  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reconnect Helper: Restore room on reload or handle 5-minute disconnect limit
  const attemptReconnect = async (roomId: string, user: User) => {
    try {
      const roomDocRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomDocRef);
      if (!roomSnap.exists()) {
        localStorage.removeItem('ipl_active_room_id');
        localStorage.removeItem('ipl_room_code');
        return;
      }

      const roomData = roomSnap.data() as Room;

      // Check participant document
      const partDocRef = doc(db, 'rooms', roomId, 'participants', user.uid);
      const partSnap = await getDoc(partDocRef);

      if (partSnap.exists()) {
        const partData = partSnap.data() as Participant;

        // 5-minute disconnect window check:
        // "if a person exit from web then he should reconnect within 5 min autherwise he is through out of the web then he should login room using the code"
        if (partData.disconnectedAt && (Date.now() - partData.disconnectedAt >= 5 * 60 * 1000)) {
          // Disconnected for more than 5 minutes: clear room session!
          localStorage.removeItem('ipl_active_room_id');
          localStorage.removeItem('ipl_room_code');
          setGlobalError(`Your session in room "${roomData.name}" (${roomData.code}) expired after 5 minutes of disconnection. Please rejoin using room code ${roomData.code}.`);
          return;
        }

        // Reconnected within 5 minutes: mark active & online!
        await updateDoc(partDocRef, {
          isOnline: true,
          disconnectedAt: null,
          status: 'active',
          lastActive: Date.now()
        });

        // If user held a franchise, reactivate it
        if (partData.selectedTeamId) {
          await updateDoc(doc(db, 'rooms', roomId, 'teamStates', partData.selectedTeamId), {
            isActive: true,
            status: 'active'
          }).catch(() => {});
        }

        setActiveRoomId(roomId);
        localStorage.setItem('ipl_active_room_id', roomId);
        localStorage.setItem('ipl_room_code', roomData.code);
        setGlobalError(null);
      } else {
        // Participant record does not exist
        localStorage.removeItem('ipl_active_room_id');
        localStorage.removeItem('ipl_room_code');
      }
    } catch (e) {
      console.warn('Reconnect error:', e);
      localStorage.removeItem('ipl_active_room_id');
    }
  };

  // 1. Initial Connection test, Redirect Auth processing & Auth Listener
  useEffect(() => {
    testConnection();

    // Process Google redirect result if returning from full-page redirect
    checkRedirectResult().catch((err) => {
      console.warn('Redirect auth check note:', err);
    });

    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        // Check URL query parameters for ?room=CODE first
        const params = new URLSearchParams(window.location.search);
        const roomCodeParam = params.get('room');
        if (roomCodeParam && !activeRoomId) {
          await joinRoomByCode(roomCodeParam.toUpperCase(), user);
          return;
        }

        // Otherwise check localStorage to auto-reconnect on page reload!
        if (!activeRoomId) {
          const savedRoomId = localStorage.getItem('ipl_active_room_id');
          if (savedRoomId) {
            await attemptReconnect(savedRoomId, user);
          }
        }
      } else {
        const params = new URLSearchParams(window.location.search);
        const roomCodeParam = params.get('room');
        if (roomCodeParam) {
          setShowAuthModal(true);
        }
      }
    });

    return () => unsubAuth();
  }, []);

  // 2. Real-time Listeners for Active Room
  useEffect(() => {
    if (!activeRoomId || !currentUser) return;

    // Room Document Listener
    const roomDocRef = doc(db, 'rooms', activeRoomId);
    const unsubRoom = onSnapshot(
      roomDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setRoom(snapshot.data() as Room);
        } else {
          setGlobalError('The auction room no longer exists.');
          setActiveRoomId(null);
          setRoom(null);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, `rooms/${activeRoomId}`)
    );

    // Participants Subcollection Listener
    const partColRef = collection(db, 'rooms', activeRoomId, 'participants');
    const unsubParts = onSnapshot(
      partColRef,
      (snapshot) => {
        const parts: Participant[] = [];
        snapshot.forEach((d) => parts.push(d.data() as Participant));
        setParticipants(parts);
      },
      (error) => handleFirestoreError(error, OperationType.GET, `rooms/${activeRoomId}/participants`)
    );

    // TeamStates Subcollection Listener
    const teamsColRef = collection(db, 'rooms', activeRoomId, 'teamStates');
    const unsubTeams = onSnapshot(
      teamsColRef,
      (snapshot) => {
        const teams: TeamState[] = [];
        snapshot.forEach((d) => teams.push(d.data() as TeamState));
        setTeamStates(teams);
      },
      (error) => handleFirestoreError(error, OperationType.GET, `rooms/${activeRoomId}/teamStates`)
    );

    // Messages Subcollection Listener
    const msgColRef = collection(db, 'rooms', activeRoomId, 'messages');
    const unsubMsgs = onSnapshot(
      msgColRef,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((d) => msgs.push(d.data() as ChatMessage));
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgs);
      },
      (error) => handleFirestoreError(error, OperationType.GET, `rooms/${activeRoomId}/messages`)
    );

    return () => {
      unsubRoom();
      unsubParts();
      unsubTeams();
      unsubMsgs();
    };
  }, [activeRoomId, currentUser]);

  // Track Window Exits, Disconnects, and 5-minute Auto-Reconnect Window
  useEffect(() => {
    if (!activeRoomId || !currentUser) return;

    const markDisconnected = () => {
      try {
        const partDocRef = doc(db, 'rooms', activeRoomId, 'participants', currentUser.uid);
        setDoc(partDocRef, {
          isOnline: false,
          disconnectedAt: Date.now(),
          status: 'disconnected',
          lastActive: Date.now()
        }, { merge: true });
      } catch {
        // Best effort
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        markDisconnected();
      } else if (document.visibilityState === 'visible') {
        // Regained focus / active again
        try {
          const partDocRef = doc(db, 'rooms', activeRoomId, 'participants', currentUser.uid);
          setDoc(partDocRef, {
            isOnline: true,
            disconnectedAt: null,
            status: 'active',
            lastActive: Date.now()
          }, { merge: true });
        } catch {
          // Best effort
        }
      }
    };

    window.addEventListener('beforeunload', markDisconnected);
    window.addEventListener('pagehide', markDisconnected);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', markDisconnected);
      window.removeEventListener('pagehide', markDisconnected);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeRoomId, currentUser]);

  // Periodic check: if any participant has been disconnected for > 5 minutes, mark timed_out and vacate/freeze franchise
  useEffect(() => {
    if (!activeRoomId || !room) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      for (const p of participants) {
        if (!p.isOnline && p.disconnectedAt && (now - p.disconnectedAt >= 5 * 60 * 1000)) {
          if (p.status !== 'timed_out' && p.status !== 'abandoned') {
            try {
              await updateDoc(doc(db, 'rooms', activeRoomId, 'participants', p.id), {
                status: 'timed_out',
                isOnline: false
              });
              if (p.selectedTeamId) {
                if (room.status === 'lobby') {
                  await updateDoc(doc(db, 'rooms', activeRoomId, 'teamStates', p.selectedTeamId), {
                    ownerId: null,
                    ownerName: 'Unclaimed',
                    isBot: false,
                    isActive: true,
                    status: 'active'
                  });
                } else {
                  await updateDoc(doc(db, 'rooms', activeRoomId, 'teamStates', p.selectedTeamId), {
                    isActive: false,
                    status: 'abandoned'
                  });
                }
              }
            } catch {
              // Ignore
            }
          }
        }
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [activeRoomId, room?.status, participants]);

  // 3. AI Bot Bidding background loop (executed by Room Host)
  useEffect(() => {
    if (!room || room.status !== 'auction') return;
    const isHost = room.hostId === currentUser?.uid;
    if (!isHost) return;

    const auctionState = room.currentAuctionState;
    if (auctionState.roundStatus !== 'bidding') return;

    const curPlayer = playerPool[auctionState.currentPlayerIndex];
    if (!curPlayer) return;

    // Filter computer-controlled bot teams
    const botTeams = teamStates.filter(t => t.isBot);
    if (botTeams.length === 0) return;

    // Delay bot reaction to simulate realistic human hesitation
    const delay = Math.floor(Math.random() * 2500 + 1500);

    botTimerRef.current = setTimeout(async () => {
      if (room.currentAuctionState.roundStatus !== 'bidding') return;

      const decision = evaluateBotBid(
        auctionState.currentBidCr,
        curPlayer,
        botTeams,
        room.rules,
        auctionState.highestBidderTeamId
      );

      if (decision && decision.shouldBid) {
        const botTeamState = teamStates.find(t => t.teamId === decision.teamId);
        if (!botTeamState) return;

        const updatedHistory = [
          ...auctionState.bidHistory,
          {
            teamId: botTeamState.teamId,
            teamCode: botTeamState.teamCode,
            teamName: botTeamState.teamName,
            amountCr: decision.amountCr,
            timestamp: Date.now(),
            bidderName: `${botTeamState.ownerName} (AI)`
          }
        ];

        // Extend authoritative deadline on bid
        const newDeadline = Date.now() + room.rules.timerSeconds * 1000;

        await updateDoc(doc(db, 'rooms', room.id), {
          'currentAuctionState.currentBidCr': decision.amountCr,
          'currentAuctionState.highestBidderTeamId': botTeamState.teamId,
          'currentAuctionState.highestBidderUserId': 'bot',
          'currentAuctionState.highestBidderName': `${botTeamState.ownerName} (AI)`,
          'currentAuctionState.bidHistory': updatedHistory,
          'currentAuctionState.deadline': newDeadline,
          updatedAt: new Date().toISOString()
        });
      }
    }, delay);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [
    room?.currentAuctionState?.currentBidCr,
    room?.currentAuctionState?.roundStatus,
    room?.currentAuctionState?.currentPlayerIndex,
    room?.status,
    teamStates
  ]);

  // Join Room by Code Helper
  const joinRoomByCode = async (code: string, userOverride?: User) => {
    const user = userOverride || currentUser;
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    try {
      const q = query(collection(db, 'rooms'), limit(50));
      const snap = await getDocs(q);
      const roomDoc = snap.docs.find(d => (d.data() as Room).code === code);

      if (!roomDoc) {
        throw new Error(`Room with code "${code}" was not found.`);
      }

      const foundRoomId = roomDoc.id;
      const foundRoom = roomDoc.data() as Room;

      // Check existing participant record
      const partDocRef = doc(db, 'rooms', foundRoomId, 'participants', user.uid);
      const existingPartSnap = await getDoc(partDocRef);
      const existingPart = existingPartSnap.exists() ? (existingPartSnap.data() as Participant) : null;

      const participant: Participant = {
        id: user.uid,
        displayName: user.displayName || `Player_${user.uid.slice(0, 4)}`,
        photoURL: user.photoURL || '',
        isHost: foundRoom.hostId === user.uid,
        selectedTeamId: existingPart?.selectedTeamId || null,
        isReady: existingPart?.isReady || false,
        isOnline: true,
        status: 'active',
        disconnectedAt: null,
        lastActive: Date.now()
      };
      await setDoc(partDocRef, participant, { merge: true });

      // If user had a selected franchise, restore it
      if (participant.selectedTeamId) {
        await updateDoc(doc(db, 'rooms', foundRoomId, 'teamStates', participant.selectedTeamId), {
          isActive: true,
          status: 'active'
        }).catch(() => {});
      }

      setActiveRoomId(foundRoomId);
      localStorage.setItem('ipl_active_room_id', foundRoomId);
      localStorage.setItem('ipl_room_code', code);
      setShowCreateJoinModal(false);
      setGlobalError(null);
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.GET, 'rooms');
    }
  };

  // Create Room Handler
  const handleCreateRoom = async (roomName: string, rules: AuctionRules) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    const roomId = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timerSeconds = rules.timerSeconds || 16;
    const finalRules: AuctionRules = {
      ...rules,
      timerSeconds
    };

    const initialAuctionState: LiveAuctionState = {
      currentPlayerIndex: 0,
      currentPlayerId: playerPool[0]?.id || null,
      currentBidCr: playerPool[0]?.basePriceCr || 2.0,
      highestBidderTeamId: null,
      highestBidderUserId: null,
      highestBidderName: null,
      bidHistory: [],
      deadline: Date.now() + timerSeconds * 1000,
      roundStatus: 'idle',
      totalSold: 0,
      totalUnsold: 0,
      unsoldPlayerIds: []
    };

    const newRoom: Room = {
      id: roomId,
      code: randomCode,
      name: roomName,
      hostId: currentUser.uid,
      hostName: currentUser.displayName || 'Room Host',
      status: 'lobby',
      format: finalRules.format,
      rules: finalRules,
      currentAuctionState: initialAuctionState,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Write Room Document
    await setDoc(doc(db, 'rooms', roomId), newRoom);

    // 2. Add Host as First Participant
    const hostPart: Participant = {
      id: currentUser.uid,
      displayName: currentUser.displayName || 'Host',
      photoURL: currentUser.photoURL || '',
      isHost: true,
      selectedTeamId: null,
      isReady: false,
      isOnline: true,
      status: 'active',
      disconnectedAt: null,
      lastActive: Date.now()
    };
    await setDoc(doc(db, 'rooms', roomId, 'participants', currentUser.uid), hostPart);

    // 3. Initialize all 10 IPL Franchises as TeamState documents
    const isMini = finalRules.format === 'mini';
    for (const team of IPL_TEAMS) {
      const startingPurse = isMini ? (team.miniAuction2026PurseCr || finalRules.startingPurseCr) : finalRules.startingPurseCr;
      const officialRetained = isMini ? (IPL_2026_OFFICIAL_RETAINED_ROSTERS[team.id] || []).map(p => ({
        playerId: p.id,
        name: p.name,
        role: p.role,
        priceCr: p.basePriceCr,
        isOverseas: p.isOverseas,
        image: p.image,
        isRetained: true
      })) : [];
      const overseasRetained = officialRetained.filter(p => p.isOverseas).length;

      const state: TeamState = {
        teamId: team.id,
        teamCode: team.code,
        teamName: team.name,
        ownerId: null,
        ownerName: 'Unclaimed',
        isBot: finalRules.aiFillBots || false,
        startingPurse,
        spentPurse: 0,
        remainingPurse: startingPurse,
        retainedPlayers: officialRetained,
        boughtPlayers: [],
        totalSquadCount: officialRetained.length,
        overseasCount: overseasRetained,
        rtmRemaining: finalRules.format === 'mega' ? finalRules.maxRtm : 0,
        isRetentionLocked: isMini,
        isActive: true,
        status: 'active'
      };
      await setDoc(doc(db, 'rooms', roomId, 'teamStates', team.id), state);
    }

    // 4. Send Welcome System Message
    const welcomeMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.uid,
      senderName: 'System',
      text: `Room created! Mode: ${finalRules.aiFillBots ? 'AI Bots Enabled' : 'Human-Only Multiplayer'}. Timer: ${timerSeconds}s. Share code ${randomCode} with friends to join.`,
      timestamp: Date.now(),
      isSystem: true
    };
    await setDoc(doc(db, 'rooms', roomId, 'messages', welcomeMsg.id), welcomeMsg);

    setActiveRoomId(roomId);
    localStorage.setItem('ipl_active_room_id', roomId);
    localStorage.setItem('ipl_room_code', randomCode);
    setShowCreateJoinModal(false);
  };

  // Solo Practice Simulation Quick Launcher
  const handleSoloPractice = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    const soloRules: AuctionRules = {
      ...OFFICIAL_RULES_PRESETS.mega,
      aiFillBots: true
    };
    await handleCreateRoom('IPL Solo Arena (vs 9 Bots)', soloRules);
  };

  // Select Franchise Handler with atomic Firestore transaction
  const handleSelectTeam = async (teamId: string) => {
    if (!activeRoomId || !currentUser) return;

    try {
      await runTransaction(db, async (transaction) => {
        const teamDocRef = doc(db, 'rooms', activeRoomId, 'teamStates', teamId);
        const partDocRef = doc(db, 'rooms', activeRoomId, 'participants', currentUser.uid);

        const teamDoc = await transaction.get(teamDocRef);
        if (!teamDoc.exists()) {
          throw new Error('Franchise not found.');
        }

        const teamData = teamDoc.data() as TeamState;
        // Verify team is not already occupied by another human player
        if (teamData.ownerId && teamData.ownerId !== currentUser.uid && !teamData.isBot) {
          throw new Error(`${teamData.teamName} is already claimed by ${teamData.ownerName}.`);
        }

        // If user already owns another franchise in this room, release previous franchise
        const previousTeam = teamStates.find(t => t.ownerId === currentUser.uid && t.teamId !== teamId);
        if (previousTeam) {
          const prevDocRef = doc(db, 'rooms', activeRoomId, 'teamStates', previousTeam.teamId);
          transaction.update(prevDocRef, {
            ownerId: null,
            ownerName: 'Unclaimed',
            isBot: false,
            isActive: true,
            status: 'active'
          });
        }

        // Claim target franchise
        transaction.update(teamDocRef, {
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName || `Player_${currentUser.uid.slice(0, 4)}`,
          isBot: false,
          isActive: true,
          status: 'active'
        });

        // Update participant's selectedTeamId
        transaction.update(partDocRef, {
          selectedTeamId: teamId
        });
      });
      setGlobalError(null);
    } catch (err: unknown) {
      console.error('Failed to select team:', err);
      const msg = err instanceof Error ? err.message : 'Could not select franchise.';
      setGlobalError(msg);
    }
  };

  // Handle participant leaving or disconnecting from room/auction
  const handleLeaveAuction = async () => {
    if (!activeRoomId || !currentUser) {
      setActiveRoomId(null);
      setRoom(null);
      return;
    }

    try {
      const isLobby = room?.status === 'lobby';
      const myFranchise = teamStates.find(t => t.ownerId === currentUser.uid);
      const otherActiveParticipants = participants.filter(p => p.id !== currentUser.uid && p.status !== 'abandoned');

      if (isLobby) {
        // In lobby: release franchise and remove participant
        if (myFranchise) {
          await updateDoc(doc(db, 'rooms', activeRoomId, 'teamStates', myFranchise.teamId), {
            ownerId: null,
            ownerName: 'Unclaimed',
            isBot: false,
            isActive: true,
            status: 'active'
          });
        }
        await deleteDoc(doc(db, 'rooms', activeRoomId, 'participants', currentUser.uid));

        // If host leaves lobby, transfer host or room closes
        if (isHost && otherActiveParticipants.length > 0) {
          const nextHost = otherActiveParticipants[0];
          await updateDoc(doc(db, 'rooms', activeRoomId), {
            hostId: nextHost.id,
            hostName: nextHost.displayName,
            updatedAt: new Date().toISOString()
          });
          await updateDoc(doc(db, 'rooms', activeRoomId, 'participants', nextHost.id), {
            isHost: true
          });
        }
      } else {
        // In LIVE AUCTION or RETENTION:
        // Priority 2 requirement: Freeze team, mark abandoned/inactive, NEVER replace with a bot!
        // Roster and expenditure stay intact.
        if (myFranchise) {
          await updateDoc(doc(db, 'rooms', activeRoomId, 'teamStates', myFranchise.teamId), {
            isActive: false,
            status: 'abandoned',
            isBot: false
          });
        }

        await updateDoc(doc(db, 'rooms', activeRoomId, 'participants', currentUser.uid), {
          status: 'abandoned',
          isOnline: false,
          isHost: false
        });

        // Broadcast announcement in chat
        const leaveMsg: ChatMessage = {
          id: `msg_${Date.now()}_leave`,
          senderId: currentUser.uid,
          senderName: 'System',
          text: `[${myFranchise?.teamCode || 'Player'}] ${currentUser.displayName || 'Participant'} has left the arena. Their franchise is frozen (inactive) and will not place further bids.`,
          timestamp: Date.now(),
          isSystem: true
        };
        await setDoc(doc(db, 'rooms', activeRoomId, 'messages', leaveMsg.id), leaveMsg);

        // If host left, transfer host authority to next active human participant
        if (isHost && otherActiveParticipants.length > 0) {
          const nextHost = otherActiveParticipants[0];
          await updateDoc(doc(db, 'rooms', activeRoomId), {
            hostId: nextHost.id,
            hostName: nextHost.displayName,
            updatedAt: new Date().toISOString()
          });
          await updateDoc(doc(db, 'rooms', activeRoomId, 'participants', nextHost.id), {
            isHost: true
          });
          const hostTransMsg: ChatMessage = {
            id: `msg_${Date.now()}_host`,
            senderId: nextHost.id,
            senderName: 'System',
            text: `Host authority transferred to ${nextHost.displayName}.`,
            timestamp: Date.now() + 1,
            isSystem: true
          };
          await setDoc(doc(db, 'rooms', activeRoomId, 'messages', hostTransMsg.id), hostTransMsg);
        }
      }

      setActiveRoomId(null);
      setRoom(null);
      localStorage.removeItem('ipl_active_room_id');
      localStorage.removeItem('ipl_room_code');
    } catch (err: unknown) {
      console.error('Leave auction error:', err);
      setActiveRoomId(null);
      setRoom(null);
      localStorage.removeItem('ipl_active_room_id');
      localStorage.removeItem('ipl_room_code');
    }
  };

  // Toggle Ready Check
  const handleToggleReady = async () => {
    if (!activeRoomId || !currentUser) return;
    const me = participants.find(p => p.id === currentUser.uid);
    if (!me) return;

    await updateDoc(doc(db, 'rooms', activeRoomId, 'participants', currentUser.uid), {
      isReady: !me.isReady
    });
  };

  // Chat message sender
  const handleSendMessage = async (text: string) => {
    if (!activeRoomId || !currentUser) return;
    const myPart = participants.find(p => p.id === currentUser.uid);
    const msgId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const message: ChatMessage = {
      id: msgId,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Player',
      teamCode: myPart?.selectedTeamId?.toUpperCase(),
      text,
      timestamp: Date.now()
    };
    await setDoc(doc(db, 'rooms', activeRoomId, 'messages', msgId), message);
  };

  // Advance from Lobby to Retention or Auction
  const handleStartAuction = async () => {
    if (!activeRoomId || !room) return;

    // In Human-Only mode (default), do NOT auto-assign bots to unclaimed teams!
    // Only assign bots if room.rules.aiFillBots is explicitly true
    if (room.rules.aiFillBots) {
      for (const t of teamStates) {
        if (!t.ownerId) {
          await updateDoc(doc(db, 'rooms', activeRoomId, 'teamStates', t.teamId), {
            isBot: true,
            ownerName: `AI ${t.teamCode} Coach`
          });
        }
      }
    }

    const nextStatus = room.format === 'mega' ? 'retention' : 'auction';
    const firstPlayer = playerPool[0];

    await updateDoc(doc(db, 'rooms', activeRoomId), {
      status: nextStatus,
      'currentAuctionState.roundStatus': nextStatus === 'auction' ? 'bidding' : 'idle',
      'currentAuctionState.deadline': Date.now() + room.rules.timerSeconds * 1000,
      'currentAuctionState.currentBidCr': firstPlayer?.basePriceCr || 2.0,
      'currentAuctionState.currentPlayerId': firstPlayer?.id || null,
      updatedAt: new Date().toISOString()
    });
  };

  // Lock Retentions
  const handleLockRetentions = async (retainedPlayers: AcquiredPlayer[]) => {
    if (!activeRoomId || !currentUser) return;
    const myTeam = teamStates.find(t => t.ownerId === currentUser.uid);
    if (!myTeam) return;

    const totalCost = retainedPlayers.reduce((acc, p) => acc + p.priceCr, 0);
    const newRemainingPurse = Number((myTeam.startingPurse - totalCost).toFixed(2));
    const overseasCount = retainedPlayers.filter(p => p.isOverseas).length;
    const rtmRemaining = Math.max(0, (room?.rules.maxRetentions || 6) - retainedPlayers.length);

    await updateDoc(doc(db, 'rooms', activeRoomId, 'teamStates', myTeam.teamId), {
      retainedPlayers,
      spentPurse: totalCost,
      remainingPurse: newRemainingPurse,
      totalSquadCount: retainedPlayers.length,
      overseasCount,
      rtmRemaining,
      isRetentionLocked: true
    });
  };

  // Unlock Retentions for Manual Editing
  const handleUnlockRetentions = async () => {
    if (!activeRoomId || !currentUser) return;
    const myTeam = teamStates.find(t => t.ownerId === currentUser.uid);
    if (!myTeam) return;

    await updateDoc(doc(db, 'rooms', activeRoomId, 'teamStates', myTeam.teamId), {
      isRetentionLocked: false
    });
  };

  // Launch Live Auction after Retentions
  const handleLaunchLiveAuction = async () => {
    if (!activeRoomId || !room) return;
    const firstPlayer = playerPool[0];

    await updateDoc(doc(db, 'rooms', activeRoomId), {
      status: 'auction',
      'currentAuctionState.roundStatus': 'bidding',
      'currentAuctionState.currentPlayerIndex': 0,
      'currentAuctionState.currentPlayerId': firstPlayer?.id || null,
      'currentAuctionState.currentBidCr': firstPlayer?.basePriceCr || 2.0,
      'currentAuctionState.highestBidderTeamId': null,
      'currentAuctionState.highestBidderName': null,
      'currentAuctionState.bidHistory': [],
      'currentAuctionState.deadline': Date.now() + room.rules.timerSeconds * 1000,
      updatedAt: new Date().toISOString()
    });
  };

  // Human Place Bid
  // Human Place Bid (Authoritative Atomic Transaction)
  const handlePlaceBid = async (amountCr: number) => {
    if (!activeRoomId || !currentUser) return;
    const myTeam = teamStates.find(t => t.ownerId === currentUser.uid);
    if (!myTeam) {
      throw new Error('You must select and control an active franchise to bid.');
    }

    const roomRef = doc(db, 'rooms', activeRoomId);
    const teamRef = doc(db, 'rooms', activeRoomId, 'teamStates', myTeam.teamId);

    await runTransaction(db, async (transaction) => {
      const roomSnap = await transaction.get(roomRef);
      const teamSnap = await transaction.get(teamRef);

      if (!roomSnap.exists()) throw new Error('Auction room does not exist.');
      if (!teamSnap.exists()) throw new Error('Franchise state not found.');

      const roomData = roomSnap.data() as Room;
      const teamData = teamSnap.data() as TeamState;
      const auctionState = roomData.currentAuctionState;

      if (auctionState.roundStatus !== 'bidding') {
        throw new Error('Bidding is currently closed for this player round.');
      }

      // Check if team already holds the highest bid
      if (auctionState.highestBidderTeamId === teamData.teamId) {
        throw new Error('Your franchise already holds the highest bid!');
      }

      const curPlayer = playerPool.find(p => p.id === auctionState.currentPlayerId) || playerPool[auctionState.currentPlayerIndex];
      if (!curPlayer) throw new Error('Player not found in catalog.');

      // Check next valid bid amount (opening bid equals base price if no prior bids)
      const hasHighest = Boolean(auctionState.highestBidderTeamId);
      const minRequiredBid = getNextBidAmount(auctionState.currentBidCr, curPlayer.basePriceCr, hasHighest);

      if (amountCr < minRequiredBid) {
        throw new Error(`Minimum valid bid is ₹${minRequiredBid.toFixed(2)} Cr.`);
      }

      // Validate squad rules, overseas limits, and purse reserves
      const val = validateBid(teamData, curPlayer, amountCr, roomData.rules, auctionState.highestBidderTeamId);
      if (!val.valid) {
        throw new Error(val.reason || 'Bid rejected by rules.');
      }

      const updatedHistory = [
        ...auctionState.bidHistory,
        {
          teamId: teamData.teamId,
          teamCode: teamData.teamCode,
          teamName: teamData.teamName,
          amountCr,
          timestamp: Date.now(),
          bidderName: currentUser.displayName || teamData.teamName
        }
      ];

      const newDeadline = Date.now() + roomData.rules.timerSeconds * 1000;

      transaction.update(roomRef, {
        'currentAuctionState.currentBidCr': amountCr,
        'currentAuctionState.highestBidderTeamId': teamData.teamId,
        'currentAuctionState.highestBidderUserId': currentUser.uid,
        'currentAuctionState.highestBidderName': currentUser.displayName || teamData.teamName,
        'currentAuctionState.bidHistory': updatedHistory,
        'currentAuctionState.deadline': newDeadline,
        updatedAt: new Date().toISOString()
      });
    });
  };

  // Hammer Sold (Authoritative Atomic Transaction)
  const handleSellPlayer = async (isRtm: boolean = false) => {
    if (!activeRoomId) return;
    const roomRef = doc(db, 'rooms', activeRoomId);

    await runTransaction(db, async (transaction) => {
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) return;
      const roomData = roomSnap.data() as Room;
      const auctionState = roomData.currentAuctionState;

      // Ensure single authoritative hammer execution
      if (auctionState.roundStatus !== 'bidding' && auctionState.roundStatus !== 'rtm_window') {
        return;
      }

      const winningTeamId = auctionState.highestBidderTeamId;
      if (!winningTeamId) return;

      const curPlayer = playerPool.find(p => p.id === auctionState.currentPlayerId) || playerPool[auctionState.currentPlayerIndex];
      if (!curPlayer) return;

      const teamRef = doc(db, 'rooms', activeRoomId, 'teamStates', winningTeamId);
      const teamSnap = await transaction.get(teamRef);
      if (!teamSnap.exists()) return;
      const winningTeam = teamSnap.data() as TeamState;

      // Deduct purchase price exactly once and append to roster
      const boughtPlayer: AcquiredPlayer = {
        playerId: curPlayer.id,
        name: curPlayer.name,
        role: curPlayer.role,
        priceCr: auctionState.currentBidCr,
        isOverseas: curPlayer.isOverseas,
        image: curPlayer.image || '',
        isRetained: false,
        isRtm
      };

      const newBoughtList = [...winningTeam.boughtPlayers, boughtPlayer];
      const newSpentPurse = Number((winningTeam.spentPurse + auctionState.currentBidCr).toFixed(2));
      const newRemainingPurse = Number((winningTeam.startingPurse - newSpentPurse).toFixed(2));
      const newOverseasCount = winningTeam.overseasCount + (curPlayer.isOverseas ? 1 : 0);
      const newTotalSquad = winningTeam.totalSquadCount + 1;

      // Set 3.5 second celebration & auto-advance window
      const autoAdvanceDeadline = Date.now() + 3500;

      transaction.update(teamRef, {
        boughtPlayers: newBoughtList,
        spentPurse: newSpentPurse,
        remainingPurse: newRemainingPurse,
        overseasCount: newOverseasCount,
        totalSquadCount: newTotalSquad
      });

      transaction.update(roomRef, {
        'currentAuctionState.roundStatus': 'sold',
        'currentAuctionState.autoAdvanceDeadline': autoAdvanceDeadline,
        'currentAuctionState.totalSold': auctionState.totalSold + 1,
        updatedAt: new Date().toISOString()
      });
    });
  };

  // Mark Unsold (Authoritative Atomic Transaction)
  const handleMarkUnsold = async () => {
    if (!activeRoomId) return;
    const roomRef = doc(db, 'rooms', activeRoomId);

    await runTransaction(db, async (transaction) => {
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) return;
      const roomData = roomSnap.data() as Room;
      const auctionState = roomData.currentAuctionState;

      // Ensure single execution
      if (auctionState.roundStatus !== 'bidding') {
        return;
      }

      const curPlayer = playerPool.find(p => p.id === auctionState.currentPlayerId) || playerPool[auctionState.currentPlayerIndex];
      if (!curPlayer) return;

      const autoAdvanceDeadline = Date.now() + 3500;

      transaction.update(roomRef, {
        'currentAuctionState.roundStatus': 'unsold',
        'currentAuctionState.autoAdvanceDeadline': autoAdvanceDeadline,
        'currentAuctionState.totalUnsold': auctionState.totalUnsold + 1,
        'currentAuctionState.unsoldPlayerIds': [...auctionState.unsoldPlayerIds, curPlayer.id],
        updatedAt: new Date().toISOString()
      });
    });
  };

  // Advance to Next Player (Authoritative Atomic Transaction)
  const handleNextPlayer = async () => {
    if (!activeRoomId) return;
    const roomRef = doc(db, 'rooms', activeRoomId);

    await runTransaction(db, async (transaction) => {
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) return;
      const roomData = roomSnap.data() as Room;
      const curAuction = roomData.currentAuctionState;

      // Prevent race conditions: only advance if finished or forced by host
      if (curAuction.roundStatus === 'bidding' && roomData.hostId !== currentUser?.uid) {
        return;
      }

      const nextIndex = curAuction.currentPlayerIndex + 1;

      // If all players completed, finish auction
      if (nextIndex >= playerPool.length) {
        transaction.update(roomRef, {
          status: 'completed',
          'currentAuctionState.roundStatus': 'idle',
          'currentAuctionState.autoAdvanceDeadline': null,
          updatedAt: new Date().toISOString()
        });
        return;
      }

      const nextPlayer = playerPool[nextIndex];
      const newDeadline = Date.now() + roomData.rules.timerSeconds * 1000;

      transaction.update(roomRef, {
        'currentAuctionState.currentPlayerIndex': nextIndex,
        'currentAuctionState.currentPlayerId': nextPlayer.id,
        'currentAuctionState.currentBidCr': nextPlayer.basePriceCr,
        'currentAuctionState.highestBidderTeamId': null,
        'currentAuctionState.highestBidderUserId': null,
        'currentAuctionState.highestBidderName': null,
        'currentAuctionState.bidHistory': [],
        'currentAuctionState.roundStatus': 'bidding',
        'currentAuctionState.deadline': newDeadline,
        'currentAuctionState.autoAdvanceDeadline': null,
        updatedAt: new Date().toISOString()
      });
    });
  };

  // Toggle Pause
  const handleTogglePause = async () => {
    if (!activeRoomId || !room) return;
    const curStatus = room.currentAuctionState.roundStatus;
    const nextStatus = curStatus === 'paused' ? 'bidding' : 'paused';

    await updateDoc(doc(db, 'rooms', activeRoomId), {
      'currentAuctionState.roundStatus': nextStatus,
      'currentAuctionState.deadline': nextStatus === 'bidding'
        ? Date.now() + room.rules.timerSeconds * 1000
        : room.currentAuctionState.deadline
    });
  };

  // Exercise RTM
  const handleExerciseRtm = async (matches: boolean) => {
    if (!activeRoomId || !room) return;
    const curPlayer = playerPool[room.currentAuctionState.currentPlayerIndex];
    if (!curPlayer || !curPlayer.originalTeam) return;

    const origTeam = teamStates.find(t => t.teamId.toLowerCase() === curPlayer.originalTeam?.toLowerCase());
    if (!origTeam) return;

    if (matches) {
      // Original team matches bid and takes player
      await updateDoc(doc(db, 'rooms', activeRoomId, 'teamStates', origTeam.teamId), {
        rtmRemaining: Math.max(0, origTeam.rtmRemaining - 1)
      });
      // Set highest bidder to original team and finalize
      await updateDoc(doc(db, 'rooms', activeRoomId), {
        'currentAuctionState.highestBidderTeamId': origTeam.teamId,
        'currentAuctionState.highestBidderName': origTeam.ownerName,
        'currentAuctionState.highestBidderUserId': origTeam.ownerId
      });
      await handleSellPlayer(true);
    } else {
      // Declined, player goes to original winning bidder
      await handleSellPlayer(false);
    }
  };

  // Trigger manual bot bid test
  const handleTriggerBotBid = async () => {
    if (!room) return;
    const curPlayer = playerPool[room.currentAuctionState.currentPlayerIndex];
    if (!curPlayer) return;
    const botTeams = teamStates.filter(t => t.isBot);
    const decision = evaluateBotBid(
      room.currentAuctionState.currentBidCr,
      curPlayer,
      botTeams,
      room.rules,
      room.currentAuctionState.highestBidderTeamId
    );
    if (decision && decision.shouldBid) {
      const botTeamState = teamStates.find(t => t.teamId === decision.teamId);
      if (!botTeamState) return;

      const updatedHistory = [
        ...room.currentAuctionState.bidHistory,
        {
          teamId: botTeamState.teamId,
          teamCode: botTeamState.teamCode,
          teamName: botTeamState.teamName,
          amountCr: decision.amountCr,
          timestamp: Date.now(),
          bidderName: `${botTeamState.ownerName} (AI)`
        }
      ];

      await updateDoc(doc(db, 'rooms', room.id), {
        'currentAuctionState.currentBidCr': decision.amountCr,
        'currentAuctionState.highestBidderTeamId': botTeamState.teamId,
        'currentAuctionState.highestBidderUserId': 'bot',
        'currentAuctionState.highestBidderName': `${botTeamState.ownerName} (AI)`,
        'currentAuctionState.bidHistory': updatedHistory,
        'currentAuctionState.deadline': Date.now() + room.rules.timerSeconds * 1000,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const myTeam = teamStates.find(t => t.ownerId === currentUser?.uid) || null;
  const isHost = room ? room.hostId === currentUser?.uid : false;
  const currentPlayer = room
    ? (playerPool.find(p => p.id === room.currentAuctionState.currentPlayerId) || playerPool[room.currentAuctionState.currentPlayerIndex] || null)
    : null;
  const currentIndex = room ? (currentPlayer ? playerPool.findIndex(p => p.id === currentPlayer.id) : room.currentAuctionState.currentPlayerIndex) : 0;
  const upcomingPlayers = room ? playerPool.slice(currentIndex + 1, currentIndex + 5) : [];
  const unsoldPlayers = room
    ? playerPool.filter(p => room.currentAuctionState.unsoldPlayerIds?.includes(p.id) || p.status === 'unsold')
    : [];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <p className="text-sm font-display font-bold text-slate-300 uppercase tracking-widest">
          INITIALIZING IPL ARENA...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 ${isPhoneTheme ? 'md:bg-slate-900/50 md:py-6 md:px-4 md:items-center md:justify-start' : ''}`}>
      {/* Phone Theme Device Frame on Desktop / Native Responsive on Mobile */}
      <div className={`w-full flex-1 flex flex-col ${isPhoneTheme ? 'md:max-w-[425px] md:min-h-[880px] md:max-h-[92vh] md:rounded-[44px] md:border-[9px] md:border-slate-800 md:shadow-[0_25px_70px_rgba(0,0,0,0.9)] md:overflow-y-auto bg-slate-950 relative scrollbar-none' : ''}`}>
        
        {/* Dynamic Island & Status Bar (Desktop Phone Mode) */}
        {isPhoneTheme && (
          <div className="hidden md:flex items-center justify-between px-6 pt-3 pb-1.5 text-[11px] font-semibold text-slate-300 bg-slate-950 sticky top-0 z-50 select-none border-b border-slate-900/60">
            <span>9:41</span>
            {/* Dynamic Island */}
            <div className="w-24 h-4 bg-slate-900 rounded-full flex items-center justify-center gap-1.5 px-2 shadow-inner">
              <div className="w-2 h-2 rounded-full bg-slate-950" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Top Navbar Header */}
        <Header
          room={room}
          myTeam={myTeam}
          currentUser={currentUser}
          isPhoneTheme={isPhoneTheme}
          onTogglePhoneTheme={handleTogglePhoneTheme}
          onOpenSquads={() => setShowSquadModal(true)}
          onOpenPlayerManager={() => setShowPlayerModal(true)}
          onSignOut={() => signOut(auth)}
          onOpenAuth={() => setShowAuthModal(true)}
          onLeaveRoom={handleLeaveAuction}
        />

      {globalError && (
        <div className="max-w-4xl mx-auto my-3 px-4 w-full">
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{globalError}</span>
            </div>
            <button onClick={() => setGlobalError(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Main Body Switch based on active room and status */}
      <main className="flex-1">
        {!room ? (
          /* Landing Screen */
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider shadow-sm">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>2025/2026 IPL Season Edition</span>
            </div>

            <div className="space-y-3 max-w-3xl">
              <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl tracking-tight uppercase leading-[0.95] bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                IPL Auction Arena
              </h1>
              <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto">
                Real-time multiplayer auction simulator. Grab your phone, draft all 10 official IPL franchises, lock in pre-auction retentions, and battle your friends for marquee superstars!
              </p>
            </div>

            {/* Quick Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
              <button
                onClick={() => {
                  if (!currentUser) setShowAuthModal(true);
                  else setShowCreateJoinModal(true);
                }}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-black text-base px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 tracking-wider uppercase"
              >
                <span>Enter Multiplayer Arena</span>
              </button>

              <button
                onClick={async () => {
                  if (!currentUser) {
                    setShowAuthModal(true);
                  } else {
                    await handleSoloPractice();
                  }
                }}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 font-bold text-sm px-6 py-4 rounded-2xl transition-all"
              >
                <span>Solo Simulation vs 9 Bots</span>
              </button>
            </div>

            {/* 10 Official Franchises showcase badges */}
            <div className="pt-10 w-full">
              <span className="text-xs uppercase font-mono tracking-widest text-slate-500 block mb-4">
                ALL 10 OFFICIAL FRANCHISES READY
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl mx-auto">
                {IPL_TEAMS.map(team => (
                  <div
                    key={team.id}
                    className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5 text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-xs shrink-0"
                      style={{ backgroundColor: team.primaryColor, color: team.textColor }}
                    >
                      {team.code}
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-white block truncate">{team.name}</span>
                      <span className="text-[10px] text-slate-400 block">{team.championships}x Titles</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : room.status === 'lobby' ? (
          /* Multiplayer Lobby */
          <LobbyView
            room={room}
            participants={participants}
            teamStates={teamStates}
            currentUserId={currentUser?.uid || ''}
            isHost={isHost}
            messages={messages}
            onSelectTeam={handleSelectTeam}
            onToggleReady={handleToggleReady}
            onStartAuction={handleStartAuction}
            onSendMessage={handleSendMessage}
            onRemoveParticipant={async (id) => {
              if (!activeRoomId) return;
              await deleteDoc(doc(db, 'rooms', activeRoomId, 'participants', id));
            }}
          />
        ) : room.status === 'retention' ? (
          /* Pre-Auction Retention Screen */
          <RetentionView
            room={room}
            teamStates={teamStates}
            allPlayers={playerPool}
            currentUserId={currentUser?.uid || ''}
            isHost={isHost}
            onLockRetentions={handleLockRetentions}
            onUnlockRetentions={handleUnlockRetentions}
            onStartLiveAuction={handleLaunchLiveAuction}
          />
        ) : room.status === 'auction' ? (
          /* Live Auction Arena */
          <LiveAuctionView
            room={room}
            teamStates={teamStates}
            currentUserId={currentUser?.uid || ''}
            currentPlayer={currentPlayer}
            upcomingPlayers={upcomingPlayers}
            isHost={isHost}
            onPlaceBid={handlePlaceBid}
            onSellPlayer={handleSellPlayer}
            onMarkUnsold={handleMarkUnsold}
            onNextPlayer={handleNextPlayer}
            onTogglePause={handleTogglePause}
            onExerciseRtm={handleExerciseRtm}
            onTriggerBotBid={handleTriggerBotBid}
          />
        ) : (
          /* Final Results & Statistics */
          <AuctionResultsView
            room={room}
            teamStates={teamStates}
            unsoldPlayers={unsoldPlayers}
            allAuctionedPlayers={teamStates.flatMap(t => [...t.retainedPlayers, ...t.boughtPlayers])}
            onRestartAuction={() => {
              setActiveRoomId(null);
              setRoom(null);
            }}
          />
        )}
      </main>

      {/* Global Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />

      <CreateOrJoinModal
        isOpen={showCreateJoinModal}
        onClose={() => setShowCreateJoinModal(false)}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={joinRoomByCode}
        onSoloPractice={handleSoloPractice}
      />

      <SquadDashboardModal
        isOpen={showSquadModal}
        onClose={() => setShowSquadModal(false)}
        teamStates={teamStates}
        room={room || {
          id: 'preview',
          code: 'IPL',
          name: 'Preview',
          hostId: '',
          hostName: '',
          status: 'lobby',
          format: 'mega',
          rules: OFFICIAL_RULES_PRESETS.mega,
          currentAuctionState: {} as any,
          createdAt: '',
          updatedAt: ''
        }}
        currentUserId={currentUser?.uid || ''}
      />

      <PlayerManagementModal
        isOpen={showPlayerModal}
        onClose={() => setShowPlayerModal(false)}
        playerPool={playerPool}
        onUpdatePlayerPool={setPlayerPool}
      />

        {/* Phone Bottom Home Indicator (Desktop Phone Mode) */}
        {isPhoneTheme && (
          <div className="hidden md:block py-2 bg-slate-950 shrink-0 sticky bottom-0 z-50">
            <div className="w-32 h-1 bg-slate-700/80 rounded-full mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}
