import React, { useState, useRef, useEffect } from 'react';
import { ChatBubbleIcon, ArrowLeftIcon, TeamIcon } from './Icons';
import { Employee, Message } from '../types';

interface Conversation {
  id: string | number;
  name: string;
  messages: Message[];
  type: 'group' | 'individual';
  lastMessage?: string;
}

// Mock data for demonstration
const mockConversationsData: { [key: string]: Conversation } = {
  'group': {
    id: 'group',
    name: 'Team Chat',
    type: 'group',
    lastMessage: 'I will take a look this afternoon.',
    messages: [
      { id: 1, sender: 'Hunter', text: 'Hey team, how is the project going?', timestamp: '10:30 AM', isCurrentUser: false },
      { id: 2, sender: 'Lucius', text: 'Making good progress on the dashboard component!', timestamp: '10:31 AM', isCurrentUser: false },
      { id: 3, sender: 'Juan Sebastian', text: 'Great to hear! I just pushed the latest changes for the tracker page.', timestamp: '10:32 AM', isCurrentUser: true },
      { id: 4, sender: 'Sandy', text: 'I will review them now. Thanks!', timestamp: '10:33 AM', isCurrentUser: false },
      { id: 5, sender: 'Bokara', text: 'Can someone check the new API integration? I think it is ready for testing.', timestamp: '10:35 AM', isCurrentUser: false },
      { id: 6, sender: 'Juan Sebastian', text: 'On it. I will take a look this afternoon.', timestamp: '10:36 AM', isCurrentUser: true },
    ],
  },
  2: {
    id: 2,
    name: 'Hunter',
    type: 'individual',
    lastMessage: 'Sounds good, let me know if you need help.',
    messages: [
      { id: 1, sender: 'Juan Sebastian', text: 'Hey Hunter, can you review the PR for the new chart component?', timestamp: '11:00 AM', isCurrentUser: true },
      { id: 2, sender: 'Hunter', text: 'Sure, I will get to it after lunch.', timestamp: '11:01 AM', isCurrentUser: false },
      { id: 3, sender: 'Juan Sebastian', text: 'Thanks!', timestamp: '11:01 AM', isCurrentUser: true },
      { id: 4, sender: 'Hunter', text: 'Sounds good, let me know if you need help.', timestamp: '11:05 AM', isCurrentUser: false },
    ],
  },
  3: {
    id: 3,
    name: 'Bokara',
    type: 'individual',
    lastMessage: 'Yes, everything is working now.',
    messages: [
       { id: 1, sender: 'Bokara', text: 'Did you fix the bug on the export feature?', timestamp: 'Yesterday', isCurrentUser: false },
       { id: 2, sender: 'Juan Sebastian', text: 'Yes, everything is working now.', timestamp: '9:15 AM', isCurrentUser: true },
    ]
  }
};

interface ChatWidgetProps {
  employees: Employee[];
  currentUser: Employee;
  userRole: 'admin' | 'employee';
}


const ChatWidget: React.FC<ChatWidgetProps> = ({ employees, currentUser, userRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState(mockConversationsData);
  const [newMessage, setNewMessage] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'chat'>('list');
  const [selectedConversationId, setSelectedConversationId] = useState<string | number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && activeView === 'chat') {
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen, activeView, selectedConversationId, conversations]);
  
  // Reset to list view when closing chat
  useEffect(() => {
    if (!isOpen) {
      setActiveView('list');
      setSelectedConversationId(null);
    }
  }, [isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && selectedConversationId) {
      const message: Message = {
        id: Date.now(),
        sender: currentUser.name,
        text: newMessage.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser: true,
      };
      
      setConversations(prev => {
        const newConversations = {...prev};
        const conversation = newConversations[selectedConversationId];
        if (conversation) {
            const updatedConversation = {
                ...conversation,
                messages: [...conversation.messages, message],
                lastMessage: message.text,
            };
            newConversations[selectedConversationId] = updatedConversation;
        }
        return newConversations;
      });

      setNewMessage('');
    }
  };

  const openConversation = (id: string | number) => {
    setSelectedConversationId(id);
    setActiveView('chat');
  };

  const selectedConversation = selectedConversationId ? conversations[selectedConversationId] : null;

  const getInitials = (name: string) => {
    const names = name.trim().split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const renderChatView = () => (
    <>
      {/* Header */}
      <div className="flex items-center p-4 border-b border-bokara-grey/10 flex-shrink-0">
          <button onClick={() => setActiveView('list')} className="p-1 text-bokara-grey/80 rounded-full hover:bg-whisper-white hover:text-bokara-grey transition-colors mr-3">
              <ArrowLeftIcon className="w-6 h-6"/>
          </button>
          <h3 className="text-lg font-bold text-bokara-grey">{selectedConversation?.name}</h3>
      </div>
      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-whisper-white/40">
          <div className="flex flex-col gap-4">
              {selectedConversation?.messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2.5 ${msg.isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      {!msg.isCurrentUser && <div className="w-8 h-8 bg-lucius-lime/20 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold border-2 border-lucius-lime/30 text-bokara-grey">{getInitials(msg.sender)}</div>}
                      <div className={`max-w-[80%] flex flex-col ${msg.isCurrentUser ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-2 rounded-xl ${msg.isCurrentUser ? 'bg-lucius-lime text-bokara-grey rounded-br-none' : 'bg-white text-bokara-grey rounded-bl-none shadow-sm'}`}>
                              <p className="text-sm break-words">{msg.text}</p>
                          </div>
                          <span className="text-xs text-bokara-grey/50 mt-1 px-1">{!msg.isCurrentUser ? `${msg.sender} at ` : ''}{msg.timestamp}</span>
                      </div>
                  </div>
              ))}
              <div ref={messagesEndRef} />
          </div>
      </div>
      {/* Input */}
      <div className="p-4 border-t border-bokara-grey/10 flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Leave a message..." className="flex-1 bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lucius-lime" />
              <button type="submit" className="p-2 bg-lucius-lime rounded-lg text-bokara-grey font-bold hover:bg-opacity-80 disabled:bg-lucius-lime/40 disabled:cursor-not-allowed" disabled={!newMessage.trim()}>
                  <svg className="w-6 h-6 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 0010 16.5V3a1 1 0 00-.894-.447z"></path></svg>
              </button>
          </form>
      </div>
    </>
  );

  const renderListView = () => {
    const otherEmployees = employees.filter(emp => emp.name !== currentUser.name);

    return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-bokara-grey/10 flex-shrink-0">
        <h3 className="text-lg font-bold text-bokara-grey">Conversations</h3>
        <button onClick={() => setIsOpen(false)} className="p-1 text-bokara-grey/60 rounded-full hover:bg-whisper-white hover:text-bokara-grey transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {/* Group Chat */}
        <button onClick={() => openConversation('group')} className="w-full text-left flex items-center gap-4 p-4 hover:bg-whisper-white/50 transition-colors">
            <div className="w-12 h-12 bg-lucius-lime/20 rounded-full flex-shrink-0 flex items-center justify-center border-2 border-lucius-lime/30">
                <TeamIcon className="w-6 h-6 text-bokara-grey" />
            </div>
            <div className="flex-grow overflow-hidden">
                <h4 className="font-bold text-bokara-grey">Team Chat</h4>
                <p className="text-sm text-bokara-grey/60 truncate">{conversations['group']?.lastMessage}</p>
            </div>
        </button>
        {/* Individual Chats */}
        {otherEmployees.map(emp => (
            <button key={emp.id} onClick={() => openConversation(emp.id)} className="w-full text-left flex items-center gap-4 p-4 hover:bg-whisper-white/50 transition-colors border-t border-bokara-grey/10">
                <div className="w-12 h-12 bg-lucius-lime/20 rounded-full flex-shrink-0 flex items-center justify-center border-2 border-lucius-lime/30">
                    <span className="text-md font-bold text-bokara-grey">{getInitials(emp.name)}</span>
                </div>
                <div className="flex-grow overflow-hidden">
                    <h4 className="font-bold text-bokara-grey">{emp.name}</h4>
                    <p className="text-sm text-bokara-grey/60 truncate">{conversations[emp.id]?.lastMessage || "No messages yet"}</p>
                </div>
            </button>
        ))}
      </div>
    </>
    );
  };


  return (
    <>
      <div
        className={`fixed bottom-24 right-4 sm:right-8 w-11/12 max-w-sm h-3/5 max-h-[600px] bg-bright-white rounded-xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out z-50 border border-bokara-grey/10 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
      >
        {activeView === 'list' ? renderListView() : renderChatView()}
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-16 h-16 bg-lucius-lime hover:bg-opacity-80 rounded-full text-bokara-grey shadow-lg flex items-center justify-center transform hover:scale-110 transition-all duration-200 z-40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bright-white focus:ring-lucius-lime"
        aria-label="Open team chat"
      >
        <ChatBubbleIcon className="w-8 h-8" />
      </button>
    </>
  );
};

export default ChatWidget;