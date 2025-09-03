
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Send, Phone, MessageCircle, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import io from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'support';
  timestamp: Date;
  type: 'text' | 'image' | 'file';
}

interface ChatSupportProps {
  orderId?: string;
  onClose?: () => void;
}

export default function ChatSupport({ orderId, onClose }: ChatSupportProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [supportAgent, setSupportAgent] = useState<any>(null);
  const socketRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000');

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      // Join support chat room
      socketRef.current.emit('join_support_chat', {
        userId: user?.id,
        orderId,
      });
    });

    socketRef.current.on('support_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      setIsTyping(false);
    });

    socketRef.current.on('support_agent_assigned', (agent: any) => {
      setSupportAgent(agent);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: `Hi ${user?.name}, I'm ${agent.name} and I'll be helping you today. How can I assist you?`,
        sender: 'support',
        timestamp: new Date(),
        type: 'text',
      }]);
    });

    socketRef.current.on('support_typing', () => {
      setIsTyping(true);
    });

    socketRef.current.on('support_stop_typing', () => {
      setIsTyping(false);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    // Load previous messages if any
    loadChatHistory();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user?.id, orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/support/chat-history?orderId=${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const history = await response.json();
        setMessages(history);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !isConnected) return;

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, message]);
    
    socketRef.current.emit('support_message', {
      ...message,
      userId: user?.id,
      orderId,
    });

    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const makePhoneCall = () => {
    // In production, integrate with calling service
    window.location.href = 'tel:+1234567890';
  };

  return (
    <Card className="w-full max-w-md h-96 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <MessageCircle className="w-4 h-4 mr-2" />
          Live Support
          {isConnected ? (
            <span className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>
          ) : (
            <span className="ml-2 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </CardTitle>
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" onClick={makePhoneCall}>
            <Phone className="w-4 h-4" />
          </Button>
          {onClose && (
            <Button size="sm" variant="outline" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-xs ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={message.sender === 'support' ? supportAgent?.avatar : user?.avatar} />
                    <AvatarFallback>
                      {message.sender === 'support' ? 'S' : user?.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`rounded-lg px-3 py-2 text-sm ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.content}
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={supportAgent?.avatar} />
                    <AvatarFallback>S</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={!isConnected}
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim() || !isConnected}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
