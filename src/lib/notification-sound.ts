// Cache for audio objects to prevent recreating them
const audioCache = new Map();
// Track when sounds were last played
const soundLastPlayed = new Map();
// Default throttle time (2 seconds)
const DEFAULT_THROTTLE = 2000;

/**
 * Plays a notification sound with throttling to prevent rapid repeats
 * @param {string} soundName - Name of the sound file (without extension)
 * @param {number} throttleTime - Minimum time between plays in milliseconds
 * @returns {Promise<void>}
 */
const notificationSound = async (
  soundName = 'pop-alert',
  throttleTime = DEFAULT_THROTTLE
): Promise<void> => {
  const now = Date.now();
  const lastPlayed = soundLastPlayed.get(soundName) || 0;
  
  // Don't play if the throttle period hasn't elapsed
  if (now - lastPlayed < throttleTime) {
    console.log(`Sound "${soundName}" throttled (last played ${now - lastPlayed}ms ago)`);
    return;
  }
  
  try {
    // Create and cache audio object if it doesn't exist
    if (!audioCache.has(soundName)) {
      const audio = new Audio(`/sound/${soundName}.mp3`);
      // Preload the audio
      audio.load();
      audioCache.set(soundName, audio);
    }
    
    const audio = audioCache.get(soundName);
    
    // Reset the audio to start if it's still playing
    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
    
    await audio.play();
    soundLastPlayed.set(soundName, now);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

/**
 * Preloads audio files for faster playback
 * @param {string[]} soundNames - Array of sound names to preload
 */
const preloadSounds = (soundNames: string[] = ['pop-alert']) => {
  soundNames.forEach(name => {
    if (!audioCache.has(name)) {
      const audio = new Audio(`/sound/${name}.mp3`);
      audio.load();
      audioCache.set(name, audio);
    }
  });
};

/**
 * Clears the audio cache to free memory
 */
const clearAudioCache = () => {
  audioCache.clear();
  soundLastPlayed.clear();
};

export { notificationSound, preloadSounds, clearAudioCache };
