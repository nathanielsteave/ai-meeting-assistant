import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = (onAudioUpload: (data: ArrayBuffer) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bufferRef = useRef<ArrayBuffer[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Accumulate audio chunks
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        bufferRef.current.push(pcmData.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Upload setiap 3 detik
      intervalRef.current = setInterval(() => {
        if (bufferRef.current.length > 0) {
          // Combine chunks
          const totalLength = bufferRef.current.reduce((acc, buf) => acc + buf.byteLength, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          
          bufferRef.current.forEach(buf => {
            combined.set(new Uint8Array(buf), offset);
            offset += buf.byteLength;
          });
          
          onAudioUpload(combined.buffer);
          bufferRef.current = [];
        }
      }, 3000);

      setIsRecording(true);
      setError(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  }, [onAudioUpload]);

  const stopRecording = useCallback(() => {
    // Upload sisa buffer
    if (bufferRef.current.length > 0) {
      const totalLength = bufferRef.current.reduce((acc, buf) => acc + buf.byteLength, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      
      bufferRef.current.forEach(buf => {
        combined.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      });
      
      onAudioUpload(combined.buffer);
    }
    
    // Cleanup
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    bufferRef.current = [];
    
    setIsRecording(false);
  }, [onAudioUpload]);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
  };
};