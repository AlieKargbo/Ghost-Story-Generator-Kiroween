# Implementation Plan

- [x] 1. Set up project structure and dependencies


  - Initialize Node.js project with TypeScript configuration
  - Install core dependencies: Express, Socket.io, React, fast-check, Jest
  - Install audio dependencies: Tone.js for Web Audio API abstraction
  - Install database dependencies: pg for PostgreSQL, ioredis for Redis
  - Set up build tooling with Vite for frontend and tsc for backend
  - Configure ESLint and Prettier with Airbnb style guide (2-space indentation)
  - Create directory structure: src/client, src/server, src/shared
  - _Requirements: 11.2_

- [x] 2. Implement core data models and interfaces


  - [x] 2.1 Create TypeScript interfaces for shared types

    - Define StorySession, StorySegment, Participant interfaces
    - Define NarrativeContext, HorrorElement interfaces
    - Define AudioSettings, SoundLayer interfaces
    - Define WebSocket event interfaces (ClientEvents, ServerEvents)
    - _Requirements: 1.1, 1.2, 2.1, 7.1_

  - [x] 2.2 Write property test for session ID uniqueness


    - **Property 1: Session creation produces unique identifiers**
    - **Validates: Requirements 1.1**

  - [x] 2.3 Implement validation utilities


    - Create content filter for profanity detection
    - Implement input sanitization functions
    - Create length validation utilities
    - _Requirements: 2.3_

  - [x] 2.4 Write property test for profanity filtering


    - **Property 7: Profanity filtering rejects inappropriate content**
    - **Validates: Requirements 2.3**

- [x] 3. Build Story Manager service

  - [x] 3.1 Implement session creation and management

    - Write createSession function with unique ID generation

    - Implement getSession function for session retrieval
    - Create addParticipant function for participant management
    - Implement session state initialization with empty narrative
    - _Requirements: 1.1, 1.2, 1.3, 6.2_

  - [x] 3.2 Write property test for empty narrative initialization


    - **Property 2: New sessions initialize with empty narrative**
    - **Validates: Requirements 1.2**

  - [x] 3.3 Write property test for session data round-trip




    - **Property 3: Session data round-trip preservation**
    - **Validates: Requirements 1.3, 5.5**

  - [x] 3.4 Implement segment management

    - Write addSegment function to append segments to narrative
    - Implement segment ordering by timestamp
    - Create getSegments function for retrieving narrative context
    - _Requirements: 2.1, 6.5, 7.5_

  - [x] 3.5 Write property test for segment addition


    - **Property 5: Segment addition grows narrative**
    - **Validates: Requirements 2.1**

  - [x] 3.6 Write property test for chronological ordering


    - **Property 9: Chronological ordering invariant**
    - **Validates: Requirements 6.5, 7.5**

  - [x] 3.7 Implement export functionality

    - Write exportSession function for text format
    - Implement HTML export with formatting
    - Include metadata (title, timestamp, attributions) in exports
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 3.8 Write property test for export completeness


    - **Property 28: Export includes all segments**
    - **Validates: Requirements 10.1**

  - [x] 3.9 Write property test for export metadata


    - **Property 29: Export includes metadata**
    - **Validates: Requirements 10.2, 10.5**

  - [x] 3.10 Write property test for export formats


    - **Property 30: Export format support**
    - **Validates: Requirements 10.4**

- [x] 4. Implement database layer


  - [x] 4.1 Set up PostgreSQL schema

    - Create sessions table with indexes
    - Create segments table with session_id and timestamp indexes
    - Create participants table with session_id index
    - Write migration scripts
    - _Requirements: 1.1, 2.1, 6.2_

  - [x] 4.2 Implement database repository


    - Write functions for session CRUD operations
    - Implement segment persistence and retrieval
    - Create participant management functions
    - Add connection pooling and error handling
    - _Requirements: 1.3, 2.1, 6.3_

  - [x] 4.3 Set up Redis caching layer


    - Implement SessionState caching in Redis
    - Create cache invalidation logic
    - Add TTL management for active sessions
    - _Requirements: 11.5_

  - [x] 4.4 Write property test for session state recovery


    - **Property 32: Session state recovery**
    - **Validates: Requirements 11.5**

- [x] 5. Build AI Co-Author service


  - [x] 5.1 Implement narrative analysis


    - Write entity extraction for characters and locations
    - Create function to detect narrative length threshold
    - Implement context summarization for LLM input
    - _Requirements: 3.1, 8.1, 8.2, 8.4_

  - [x] 5.2 Integrate with LLM API


    - Set up OpenAI API client with error handling
    - Implement prompt engineering for horror element generation
    - Add retry logic with exponential backoff
    - Create content filtering for AI-generated text
    - _Requirements: 3.2, 12.2_

  - [x] 5.3 Write property test for AI trigger threshold


    - **Property 10: AI triggers at threshold**
    - **Validates: Requirements 3.1**

  - [x] 5.4 Write property test for AI context coherence


    - **Property 11: AI maintains context coherence**
    - **Validates: Requirements 3.2, 8.1, 8.2, 8.4**

  - [x] 5.5 Write property test for AI content filtering


    - **Property 14: AI content filtering**
    - **Validates: Requirements 12.2**

  - [x] 5.3 Implement AI contribution workflow


    - Create shouldTrigger function to check threshold
    - Write generateHorrorElement function with context awareness
    - Implement AI segment creation with 'ai' contributor type
    - _Requirements: 3.1, 3.3, 7.2_

  - [x] 5.7 Write property test for AI segment marking


    - **Property 12: AI segments are marked distinctly**
    - **Validates: Requirements 3.3, 3.4, 7.2, 7.3**

  - [x] 5.8 Write property test for AI generation diversity


    - **Property 13: AI generation diversity**
    - **Validates: Requirements 12.1**

- [x] 6. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Build WebSocket server




  - [x] 7.1 Set up Socket.io server


    - Initialize Socket.io with Express server
    - Configure CORS and connection settings
    - Implement connection and disconnection handlers
    - _Requirements: 2.2, 6.2, 6.4_

  - [x] 7.2 Implement session event handlers


    - Create 'session:create' event handler
    - Implement 'session:join' event handler with room management
    - Write 'segment:add' event handler with broadcast logic
    - Create 'session:export' event handler
    - _Requirements: 1.1, 2.1, 2.2, 6.2, 10.1_

  - [x] 7.3 Write property test for broadcast to all participants


    - **Property 6: Broadcast reaches all participants**
    - **Validates: Requirements 2.2**

  - [x] 7.4 Write property test for join notifications

    - **Property 26: Join notifications broadcast**
    - **Validates: Requirements 6.4**

  - [x] 7.5 Implement invite link generation




    - Create generateInviteLink function with secure tokens
    - Implement link validation and session lookup
    - _Requirements: 6.1, 6.2_



  - [x] 7.6 Write property test for invite link uniqueness

    - **Property 23: Invite links are unique and valid**
    - **Validates: Requirements 6.1**



  - [x] 7.7 Write property test for invite link functionality


    - **Property 24: Invite links add participants**
    - **Validates: Requirements 6.2**



  - [x] 7.8 Implement participant synchronization


    - Write logic to send full narrative context to new participants
    - Implement participant list broadcasting
    - _Requirements: 6.3, 6.4_



  - [x] 7.9 Write property test for new participant context sync


    - **Property 25: New participants receive full context**
    - **Validates: Requirements 6.3**

  - [x] 7.10 Add offline queue and reconnection logic


    - Implement client-side queue for offline segments
    - Create reconnection handler with exponential backoff
    - Add sync logic to send queued segments on reconnect
    - _Requirements: 11.3_

  - [x] 7.11 Write property test for offline queue and sync




    - **Property 31: Offline queue and sync**
    - **Validates: Requirements 11.3**

- [x] 8. Implement Audio Engine


  - [x] 8.1 Set up Web Audio API foundation


    - Initialize AudioContext with browser compatibility checks
    - Create master gain node for volume control
    - Set up audio node graph architecture
    - Implement audio context resume on user interaction
    - _Requirements: 1.4, 5.1_

  - [x] 8.2 Implement mood analysis system


    - Create keyword dictionary for mood detection (horror, calm, tense, etc.)
    - Write analyzeMood function to extract mood tags from text
    - Implement keyword detection for sound effects (scream, thunder, creak)
    - Create location keyword detection (forest, basement, ocean)
    - _Requirements: 4.1, 4.2, 9.1, 9.4_

  - [x] 8.3 Write property test for audio content analysis


    - **Property 15: Audio analyzes all content changes**
    - **Validates: Requirements 2.5, 4.1**

  - [x] 8.4 Write property test for keyword sound triggers


    - **Property 16: Keywords trigger sound effects**
    - **Validates: Requirements 4.2, 9.1**

  - [x] 8.5 Write property test for location soundscape changes

    - **Property 22: Location keywords affect soundscape**
    - **Validates: Requirements 9.4**

  - [x] 8.6 Build soundscape generation system


    - Create ambient sound generators using Tone.js oscillators
    - Implement sound layer management (add, remove, blend)
    - Write soundscape transition logic for mood shifts
    - Create location-specific soundscape presets
    - _Requirements: 1.4, 4.3, 4.5, 9.4_


  - [x] 8.7 Write property test for mood shift soundscape changes

    - **Property 17: Mood shifts change soundscape**
    - **Validates: Requirements 4.3**

  - [x] 8.8 Write property test for audio intensity progression


    - **Property 19: Audio intensity progression**
    - **Validates: Requirements 4.5**

  - [x] 8.9 Implement sound effect system


    - Load or generate sound effect samples
    - Create triggerEffect function for keyword-based effects
    - Implement effect prioritization for simultaneous triggers
    - Add effect mixing without clipping
    - _Requirements: 4.2, 4.4, 9.1, 9.5_

  - [x] 8.10 Write property test for audio level bounds


    - **Property 18: Audio levels stay within bounds**
    - **Validates: Requirements 4.4**

  - [x] 8.11 Implement volume controls


    - Create setVolume function for master volume
    - Implement separate controls for ambient and effects volumes
    - Add mute/unmute functionality that preserves state
    - Persist audio settings to session storage
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 8.12 Write property test for volume control


    - **Property 20: Volume control immediate effect**
    - **Validates: Requirements 5.1**

  - [x] 8.13 Write property test for mute state preservation


    - **Property 21: Mute preserves state**
    - **Validates: Requirements 5.2, 5.3**

  - [x] 8.14 Connect audio engine to story events


    - Subscribe to segment addition events
    - Trigger mood analysis on each new segment
    - Update soundscape based on analysis results
    - _Requirements: 2.5, 4.1_

- [x] 9. Build React frontend

  - [x] 9.1 Set up React application structure


    - Initialize React app with TypeScript and Vite
    - Configure routing with React Router
    - Set up global state management with Context API or Zustand
    - Create component directory structure
    - _Requirements: 11.2, 11.4_

  - [x] 9.2 Create session management components


    - Build SessionCreate component for starting new sessions
    - Implement SessionJoin component for invite links
    - Create SessionView component as main story interface
    - _Requirements: 1.1, 1.3, 6.1, 6.2_

  - [x] 9.3 Implement story display components


    - Create StorySegment component with contributor attribution
    - Build NarrativeView component for full story display
    - Implement visual distinction for AI vs user segments
    - Add timestamp display on hover
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.4 Write property test for contributor information display


    - **Property 27: Segments display contributor information**
    - **Validates: Requirements 7.1**

  - [x] 9.5 Build story input component


    - Create StoryInput component with text area
    - Implement character count and validation
    - Add submit button and Enter key handling
    - Implement input clearing after successful submission
    - _Requirements: 2.1, 2.4_

  - [x] 9.6 Write property test for input clearing


    - **Property 8: Successful submission clears input**
    - **Validates: Requirements 2.4**

  - [x] 9.7 Create audio control components


    - Build AudioControls component with volume slider
    - Implement mute/unmute toggle button
    - Add advanced controls toggle for separate volume controls
    - Create visual feedback for audio state
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 9.8 Implement participant list component


    - Create ParticipantList component showing all users
    - Add join/leave notifications
    - Display participant count
    - _Requirements: 6.4_

  - [x] 9.9 Build export functionality UI


    - Create ExportButton component
    - Implement format selection (text/HTML)
    - Add download trigger for exported content
    - _Requirements: 10.1, 10.4_

- [x] 10. Integrate WebSocket client


  - [x] 10.1 Set up Socket.io client


    - Initialize Socket.io client with connection management
    - Implement reconnection logic with exponential backoff
    - Create event listener registration system
    - _Requirements: 2.2, 11.3_


  - [x] 10.2 Implement client-side event handlers

    - Create handlers for 'session:created', 'session:updated'
    - Implement 'segment:added' handler to update UI
    - Add 'participant:joined' handler for notifications
    - Create error handler for server errors
    - _Requirements: 2.2, 6.3, 6.4_

  - [x] 10.3 Build client-side state synchronization


    - Implement state updates on server events
    - Create optimistic UI updates for user actions
    - Add conflict resolution for concurrent edits
    - Implement session state restoration on page refresh
    - _Requirements: 2.2, 11.5_

  - [x] 10.4 Add offline support


    - Implement local queue for segments during offline mode
    - Create visual indicator for offline status
    - Add sync logic to send queued items on reconnect
    - _Requirements: 11.3_

- [x] 11. Integrate Audio Engine with UI




  - [x] 11.1 Initialize audio engine on session start


    - Create audio engine instance when session loads
    - Start ambient sounds on session creation
    - Handle browser autoplay policies with user interaction
    - _Requirements: 1.4_

  - [x] 11.2 Write property test for session creation audio activation


    - **Property 4: Session creation activates audio**
    - **Validates: Requirements 1.4**

  - [x] 11.3 Connect audio controls to engine


    - Wire volume sliders to audio engine setVolume
    - Connect mute button to audio engine mute/unmute
    - Implement advanced controls toggle functionality
    - Persist settings to session storage
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 11.4 Subscribe audio engine to story events


    - Listen for segment addition events from WebSocket
    - Trigger mood analysis on each new segment
    - Update soundscape based on analysis
    - Trigger sound effects for detected keywords
    - _Requirements: 2.5, 4.1, 4.2, 9.1_

- [x] 12. Add styling and responsive design



  - [x] 12.1 Create base styles and theme


    - Set up CSS variables for dark, atmospheric theme
    - Create typography styles for readability
    - Implement color scheme for horror aesthetic
    - _Requirements: 11.4_

  - [x] 12.2 Style story components


    - Style StorySegment with distinct user/AI visual treatment
    - Create atmospheric styling for NarrativeView
    - Add hover effects for timestamps
    - Implement smooth transitions for new segments
    - _Requirements: 7.3_

  - [x] 12.3 Implement responsive layout


    - Create mobile-friendly layout with media queries
    - Ensure audio controls are accessible on small screens
    - Make story input usable on touch devices
    - Test and adjust for various screen sizes
    - _Requirements: 11.4_

- [x] 13. Implement error handling and user feedback




  - [x] 13.1 Add client-side error handling


    - Create error boundary components for React
    - Implement user-friendly error messages
    - Add retry mechanisms for failed operations
    - Create fallback UI for audio failures
    - _Requirements: 2.3, 11.3_

  - [x] 13.2 Add loading states and feedback


    - Implement loading indicators for AI generation
    - Add visual feedback for segment submission
    - Create connection status indicator
    - Show export progress feedback
    - _Requirements: 2.4, 10.1_


  - [x] 13.3 Implement validation feedback

    - Show error messages for invalid inputs
    - Display character count warnings
    - Add visual feedback for filtered content
    - _Requirements: 2.3_

- [x] 14. Final checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.
