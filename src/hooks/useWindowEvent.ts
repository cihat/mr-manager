import { useState, useEffect } from 'react';

type UseWindowEvent = <T extends keyof WindowEventMap, V>(
  eventType: T,
  handler: (event?: WindowEventMap[T]) => V,
) => V;

const useWindowEvent: UseWindowEvent = (eventType, handler) => {
  const [result, setResult] = useState(handler);

  useEffect(() => {
    const onResize = (e: Parameters<typeof handler>[0]) => {
      setResult(handler(e));
    };

    window.addEventListener(eventType, onResize);

    return () => {
      window.removeEventListener(eventType, onResize);
    };
  }, [eventType, handler]);

  return result;
};

export default useWindowEvent;
