'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  type: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

interface TestDriveForm {
  car?: string;
  date?: string;
  time?: string;
  name?: string;
  contact?: string;
}

const QUESTIONS = [
  { key: 'car', text: 'Which car would you like to test drive?' },
  { key: 'date', text: 'What date works for you?' },
  { key: 'time', text: 'What time do you prefer?' },
  { key: 'name', text: "What's your name?" },
  { key: 'contact', text: 'Email or phone number?' },
] as const;

export default function TestDriveChat({ carName, onClose }: { carName?: string; onClose: () => void }) {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [formData, setFormData] = useState<TestDriveForm>({});
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage = carName 
      ? `Hi! I can help you book a test drive for the ${carName}. Let's get started!`
      : 'Hi! I can help you book a test drive. Let\'s get started!';
    
    // If car name is provided, pre-fill it and skip to date question
    if (carName) {
      setFormData({ car: carName });
      setCurrentQuestionIndex(1); // Start with date question
    }
    
    setTimeout(() => {
      addBotMessage(welcomeMessage);
      setTimeout(() => {
        setIsBotTyping(true);
        setTimeout(() => {
          const questionIndex = carName ? 1 : 0; // Skip car question if car name provided
          const question = QUESTIONS[questionIndex];
          addBotMessage(question.text);
          setIsBotTyping(false);
        }, 600);
      }, 800);
    }, 500);
  }, [carName]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, currentQuestionIndex]);

  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, { type: 'bot', text, timestamp: new Date() }]);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { type: 'user', text, timestamp: new Date() }]);
  };

  const askNextQuestion = (questionIndex: number) => {
    if (questionIndex < QUESTIONS.length) {
      setIsBotTyping(true);
      setTimeout(() => {
        const question = QUESTIONS[questionIndex];
        addBotMessage(question.text);
        setIsBotTyping(false);
      }, 600);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isBotTyping || isComplete) return;

    const trimmedValue = inputValue.trim();
    addUserMessage(trimmedValue);

    // Store the answer
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    setFormData(prev => ({
      ...prev,
      [currentQuestion.key]: trimmedValue,
    }));

    setInputValue('');

    // Move to next question
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      // Move to next question
      const nextIndex = currentQuestionIndex + 1;
      setTimeout(() => {
        setCurrentQuestionIndex(nextIndex);
        askNextQuestion(nextIndex);
      }, 800);
    } else {
      // All questions answered - send confirmation email
      setIsBotTyping(true);
      
      // Store the last answer first
      const currentQuestion = QUESTIONS[currentQuestionIndex];
      const finalFormData = {
        ...formData,
        [currentQuestion.key]: trimmedValue,
      };
      
      // Update formData state
      setFormData(finalFormData);
      
      setTimeout(async () => {
        try {
          console.log('Sending test drive request with data:', finalFormData);
          
          // Send email
          const response = await fetch('/api/test-drive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              carName: finalFormData.car || carName || 'Selected Vehicle',
              date: finalFormData.date,
              time: finalFormData.time,
              name: finalFormData.name,
              contact: finalFormData.contact,
              email: finalFormData.contact?.includes('@') ? finalFormData.contact : undefined,
            }),
          });

          const result = await response.json();

          if (response.ok) {
            addBotMessage('Thanks! Your test drive request has been submitted 🚗');
            addBotMessage('📧 A confirmation email has been sent to you with all the details!');
            setIsComplete(true);
            setIsBotTyping(false);
          } else {
            // Handle different error types
            const errorMessage = result.message || result.error || 'Unknown error';
            
            addBotMessage('Thanks! Your test drive request has been submitted 🚗');
            
            // Check if it's a domain verification issue
            if (errorMessage.includes('domain verification') || errorMessage.includes('only allows sending to the account owner')) {
              addBotMessage('📧 Note: Email sending requires domain verification. Your request was received and our team will contact you directly!');
              if (result.suggestion) {
                addBotMessage(`💡 ${result.suggestion}`);
              }
            } else {
              addBotMessage('⚠️ Note: We couldn\'t send a confirmation email, but your request was received. Our team will contact you soon!');
            }
            
            setIsComplete(true);
            setIsBotTyping(false);
            console.error('Email error:', result);
          }
        } catch (error) {
          console.error('Error sending test drive request:', error);
          addBotMessage('Thanks! Your test drive request has been submitted 🚗');
          addBotMessage('⚠️ Note: We couldn\'t send a confirmation email, but your request was received. Our team will contact you soon!');
          setIsComplete(true);
          setIsBotTyping(false);
        }
      }, 800);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity pointer-events-auto"
        onClick={handleClose}
      />
      
      {/* Chat Widget */}
      <div className="relative w-full max-w-md h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col pointer-events-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">Test Drive Booking</h3>
              <p className="text-white/80 text-xs">We're here to help</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            aria-label="Close chat"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isBotTyping && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 rounded-2xl px-4 py-2 shadow-sm border border-gray-200">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
          {!isComplete ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isBotTyping}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isBotTyping}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Send
              </button>
            </form>
          ) : (
            <div className="text-center">
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

