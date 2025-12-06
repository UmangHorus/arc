// VoiceNoteRecorder.js
'use client';

import React from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useRecorder from '@/hooks/useRecorder';

const VoiceNoteRecorder = ({ onBlobChange }) => {
  const { isRecording, blob, error, startRecording, stopRecording } = useRecorder();

  // Pass the blob to the parent component whenever it changes
  React.useEffect(() => {
    if (blob) {
      onBlobChange(blob);
    }
  }, [blob, onBlobChange]);

  return (
    <div className="space-y-4">
      {error && <p className="text-red-500">{error}</p>}
      <div className="flex items-center gap-4">
        <Button
          className="flex items-center gap-2 px-4 py-2 bg-[#287f71] text-white rounded-md hover:bg-[#20665a] transition-colors [&_svg]:size-6"
          onClick={isRecording ? stopRecording : startRecording}
          type="button"
        >
          <Mic size={24} className="size-6" />
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
        
        {/* Wave Animation */}
        {isRecording && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-6 bg-[#287f71] rounded-full animate-wave"
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceNoteRecorder;