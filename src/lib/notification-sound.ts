const notificationSound = async (soundName: string = 'pop-alert'): Promise<void> => {
  try {
    const audio = new Audio(`/sound/${soundName}.mp3`);
    await audio.play();
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

export { notificationSound };
