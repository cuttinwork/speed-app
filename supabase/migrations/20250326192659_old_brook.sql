/*
  # Chat System Implementation
  
  1. New Tables
    - `chat_rooms`
      - For managing conversations between users
      - Stores metadata about the chat
    
    - `chat_messages`
      - Stores actual messages
      - Includes read status and typing indicators
    
  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Ensure users can only access their own chats
*/

-- Create chat_rooms table
CREATE TABLE chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  participant1_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  participant2_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(participant1_id, participant2_id)
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  deleted_at timestamptz
);

-- Create typing_indicators table
CREATE TABLE typing_indicators (
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Chat rooms policies
CREATE POLICY "Users can view their chat rooms"
ON chat_rooms FOR SELECT
TO authenticated
USING (
  auth.uid() = participant1_id OR 
  auth.uid() = participant2_id
);

CREATE POLICY "Users can create chat rooms with other users"
ON chat_rooms FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (participant1_id, participant2_id) AND
  participant1_id != participant2_id AND
  NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = participant1_id AND blocked_id = participant2_id)
    OR (blocker_id = participant2_id AND blocked_id = participant1_id)
  )
);

-- Chat messages policies
CREATE POLICY "Users can view messages in their rooms"
ON chat_messages FOR SELECT
TO authenticated
USING (
  room_id IN (
    SELECT id FROM chat_rooms
    WHERE auth.uid() = participant1_id 
    OR auth.uid() = participant2_id
  )
);

CREATE POLICY "Users can send messages to their rooms"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  room_id IN (
    SELECT id FROM chat_rooms
    WHERE auth.uid() = participant1_id 
    OR auth.uid() = participant2_id
  ) AND
  auth.uid() = sender_id
);

CREATE POLICY "Users can delete their own messages"
ON chat_messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (
  deleted_at IS NOT NULL AND
  auth.uid() = sender_id
);

-- Typing indicators policies
CREATE POLICY "Users can see typing indicators in their rooms"
ON typing_indicators FOR SELECT
TO authenticated
USING (
  room_id IN (
    SELECT id FROM chat_rooms
    WHERE auth.uid() = participant1_id 
    OR auth.uid() = participant2_id
  )
);

CREATE POLICY "Users can manage their typing status"
ON typing_indicators
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to update chat room's last_message_at
CREATE OR REPLACE FUNCTION update_chat_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update chat room timestamp
CREATE TRIGGER update_chat_room_timestamp
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_room_timestamp();

-- Function to clean up old typing indicators
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup typing indicators
CREATE TRIGGER cleanup_typing_indicators
AFTER INSERT OR UPDATE ON typing_indicators
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_typing_indicators();