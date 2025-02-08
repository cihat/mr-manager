const notificationSound = async (): Promise<void> => {
  try {
    const audio = new Audio('/pop-alert.mp3');
    await audio.play();
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

export {
  notificationSound
}

// let isPlaying = false;
// let lastPlayTime = 0;
// const COOLDOWN_PERIOD = 2 * 60 * 1000;
// // const COOLDOWN_PERIOD = 0;

// const notificationSound = async (): Promise<void> => {
//   const currentTime = Date.now();

//   // Eğer ses çalınıyorsa veya bekleme süresi dolmadıysa çalma
//   if (isPlaying || currentTime - lastPlayTime < COOLDOWN_PERIOD) {
//     return;
//   }

//   try {
//     isPlaying = true;
//     const audio = new Audio('/public/notification.mp3');

//     // Ses çalma işlemi bittiğinde flag'i resetle
//     audio.onended = () => {
//       isPlaying = false;
//       lastPlayTime = Date.now();
//     };

//     await audio.play();
//   } catch (error) {
//     isPlaying = false; // Hata durumunda flag'i resetle
//     console.error('Error playing notification sound:', error);
//   }
// };

// export {
//   notificationSound
// }
