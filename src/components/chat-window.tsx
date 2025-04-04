import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/lib/chat';
import { useAuth } from '@/lib/auth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type ChatWindowProps = {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
};

export function ChatWindow({ otherUserId, otherUserName, otherUserAvatar }: ChatWindowProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isOtherUserTyping,
    loading,
    sendMessage,
    setTyping,
    markAsRead,
    deleteMessage,
  } = useChat(otherUserId);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  useEffect(() => {
    if (isTyping) {
      setTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTyping(false);
      }, 2000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, setTyping]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    setIsTyping(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await sendMessage(message);
      setMessage('');
      setIsTyping(false);
      setTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-lg">
            <AvatarImage src={otherUserAvatar} className="rounded-lg" />
            <AvatarFallback className="rounded-lg">{otherUserName[0]}</AvatarFallback>
          </Avatar>
          <CardTitle>{otherUserName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-4 p-4">
            {messages.map((msg) => {
              const isSender = msg.sender_id === user?.id;
              
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2",
                    isSender ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={isSender ? user?.user_metadata?.avatar_url : otherUserAvatar}
                      className="rounded-lg"
                    />
                    <AvatarFallback className="rounded-lg">
                      {isSender
                        ? user?.email?.[0].toUpperCase()
                        : otherUserName[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div
                    className={cn(
                      "group relative max-w-[70%] rounded-lg px-3 py-2 text-sm",
                      isSender
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {msg.deleted_at ? (
                      <span className="italic text-muted-foreground">
                        This message was deleted
                      </span>
                    ) : (
                      <>
                        <p>{msg.content}</p>
                        {isSender && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -right-10 top-0 hidden group-hover:flex"
                            onClick={() => deleteMessage(msg.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                    <span
                      className={cn(
                        "mt-1 text-xs",
                        isSender
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                  </div>
                </div>
              );
            })}
            {isOtherUserTyping && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {otherUserName} is typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={message}
            onChange={handleMessageChange}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}