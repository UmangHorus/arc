import { useEffect, useRef } from "react";

export const useSound = (soundFile) => {
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio(soundFile);
    audioRef.current.load();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [soundFile]);

  const play = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((e) => console.warn("Audio play blocked or failed:", e));
    }
  };

  return play;
};
