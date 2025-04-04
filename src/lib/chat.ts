import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

export type ChatRoom = {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  deleted_at: string | null;
};

export type TypingIndicator = {
  room_id: string;
  user_id: string;
  updated_at: string;
};

export function useChat(otherUserId: string) {
  const { user } = useAuth();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Get or create chat room
    async function initializeChat() {
      try {
        // Always try to find existing room first
        const { data: existingRoom } = await supabase
          .from('chat_rooms')
          .select('*')
          .or(
            `and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),` +
            `and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`
          )
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        let currentRoom = existingRoom;

        if (!currentRoom) {
          // Ensure participants are ordered consistently to avoid unique constraint violations
          const [participant1_id, participant2_id] = [user.id, otherUserId].sort();
          
          try {
            const { data: newRoom, error: createError } = await supabase
              .from('chat_rooms')
              .insert([
                {
                  participant1_id,
                  participant2_id,
                },
              ])
              .select()
              .single();

            if (createError) throw createError;
            currentRoom = newRoom;
          } catch (error: any) {
            // If the error is a unique constraint violation, try to get the existing room
            if (error.code === '23505') {
              const { data: recoveredRoom } = await supabase
                .from('chat_rooms')
                .select('*')
                .or(
                  `and(participant1_id.eq.${participant1_id},participant2_id.eq.${participant2_id}),` +
                  `and(participant1_id.eq.${participant2_id},participant2_id.eq.${participant1_id})`
                )
                .limit(1)
                .maybeSingle();

              if (recoveredRoom) {
                currentRoom = recoveredRoom;
              } else {
                throw new Error('Failed to recover chat room after unique constraint violation');
              }
            } else {
              throw error;
            }
          }
        }

        if (!currentRoom) {
          throw new Error('Failed to initialize chat room');
        }

        setRoom(currentRoom);

        // Load messages
        const { data: messages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', currentRoom.id)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        setMessages(messages || []);

        // Subscribe to new messages
        const messagesSubscription = supabase
          .channel(`room:${currentRoom.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `room_id=eq.${currentRoom.id}`,
            },
            (payload) => {
              setMessages((current) => [...current, payload.new as ChatMessage]);
            }
          )
          .subscribe();

        // Subscribe to typing indicators
        const typingSubscription = supabase
          .channel(`typing:${currentRoom.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'typing_indicators',
              filter: `room_id=eq.${currentRoom.id}`,
            },
            (payload) => {
              if (payload.new?.user_id === otherUserId) {
                setIsOtherUserTyping(true);
                // Auto-remove typing indicator after 3 seconds
                setTimeout(() => setIsOtherUserTyping(false), 3000);
              }
            }
          )
          .subscribe();

        setLoading(false);

        return () => {
          messagesSubscription.unsubscribe();
          typingSubscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing chat:', error);
        setLoading(false);
      }
    }

    initializeChat();
  }, [user, otherUserId]);

  const sendMessage = async (content: string) => {
    if (!room || !user) return;

    try {
      // Create the message object
      const newMessage: Partial<ChatMessage> = {
        room_id: room.id,
        sender_id: user.id,
        content,
        created_at: new Date().toISOString(),
      };

      // Optimistically add the message to the UI
      setMessages((current) => [...current, newMessage as ChatMessage]);

      // Send the message to the server
      const { error } = await supabase
        .from('chat_messages')
        .insert([newMessage]);

      if (error) {
        // If there's an error, remove the optimistically added message
        setMessages((current) => 
          current.filter(msg => msg.content !== content || msg.sender_id !== user.id)
        );
        throw error;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const setTyping = async (isTyping: boolean) => {
    if (!room || !user) return;

    try {
      if (isTyping) {
        await supabase
          .from('typing_indicators')
          .upsert(
            {
              room_id: room.id,
              user_id: user.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'room_id,user_id' }
          );
      } else {
        await supabase
          .from('typing_indicators')
          .delete()
          .match({ room_id: room.id, user_id: user.id });
      }
    } catch (error) {
      console.error('Error updating typing indicator:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', otherUserId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('chat_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', user.id);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  return {
    room,
    messages,
    isOtherUserTyping,
    loading,
    sendMessage,
    setTyping,
    markAsRead,
    deleteMessage,
  };
}