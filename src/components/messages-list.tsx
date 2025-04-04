import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { format } from 'date-fns';
import { ChatWindow } from './chat-window';

type ChatRoom = {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  participant: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  latest_message: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
};

export function MessagesList() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);

  useEffect(() => {
    if (!user) return;

    async function loadChatRooms() {
      try {
        const { data, error } = await supabase
          .from('chat_rooms')
          .select(`
            *,
            participant:participant2_id(id, full_name, avatar_url),
            latest_message:chat_messages(content, created_at, sender_id)
          `)
          .eq('participant1_id', user?.id)
          .order('last_message_at', { ascending: false });

        if (error) throw error;

        // Also get rooms where user is participant2
        const { data: data2, error: error2 } = await supabase
          .from('chat_rooms')
          .select(`
            *,
            participant:participant1_id(id, full_name, avatar_url),
            latest_message:chat_messages(content, created_at, sender_id)
          `)
          .eq('participant2_id', user?.id)
          .order('last_message_at', { ascending: false });

        if (error2) throw error2;

        const allRooms = [...(data || []), ...(data2 || [])].sort((a, b) => 
          new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        );

        setRooms(allRooms);
      } catch (error) {
        console.error('Error loading chat rooms:', error);
      } finally {
        setLoading(false);
      }
    }

    loadChatRooms();

    // Subscribe to new messages
    const subscription = supabase
      .channel('chat_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          loadChatRooms(); // Reload rooms when new messages arrive
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="h-20"></Card>
        ))}
      </div>
    );
  }

  if (selectedRoom) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedRoom(null)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Messages
        </button>
        <ChatWindow
          otherUserId={selectedRoom.participant.id}
          otherUserName={selectedRoom.participant.full_name || 'User'}
          otherUserAvatar={selectedRoom.participant.avatar_url || undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Messages</h2>
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {rooms.map((room) => {
            // Fix the array indexing issue by properly accessing the latest message
            const latestMessage = room.latest_message && (Array.isArray(room.latest_message) 
              ? room.latest_message[0] 
              : room.latest_message);
            
            return (
              <Card
                key={room.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedRoom(room)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 rounded-lg">
                      <AvatarImage src={room.participant.avatar_url || undefined} className="rounded-lg" />
                      <AvatarFallback className="rounded-lg">
                        {room.participant.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {room.participant.full_name || 'User'}
                      </p>
                      {latestMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {latestMessage.sender_id === user?.id ? 'You: ' : ''}
                          {latestMessage.content}
                        </p>
                      )}
                    </div>
                    {latestMessage && (
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(latestMessage.created_at), 'MMM d')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {rooms.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No messages yet
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}