import { supabase } from './supabase';

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
};

export async function sendMessage(receiverId: string, content: string) {
  const { data: message, error } = await supabase
    .from('messages')
    .insert([
      {
        receiver_id: receiverId,
        content,
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return message;
}

export function useMessages(otherUserId: string) {
  const getMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  };

  const subscribeToMessages = (callback: (message: Message) => void) => {
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${otherUserId},receiver_id=eq.${otherUserId}`,
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  return {
    getMessages,
    subscribeToMessages,
  };
}