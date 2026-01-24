import { useEffect } from 'react';
import { toast } from 'sonner';
import { requestForToken, onMessageListener } from '../services/messaging';
import { useAuth } from '../context/AuthContext';

const useFCM = () => {
    const { user } = useAuth();

    // useEffect(() => {
    //     // Removed auto-request to comply with iOS requirements and avoid unexpected prompts.
    //     // Valid request must be triggered by user interaction (e.g. button click).
    //     // if (user) {
    //     //     requestForToken(user.id);
    //     // }
    // }, [user]);

    useEffect(() => {
        const unsubscribe = onMessageListener().then((payload) => {
            const { title, body, image } = payload.notification;

            // Show toast
            toast(title, {
                description: body,
                duration: 6000,
                icon: image ? <img src={image} alt="icon" className="w-8 h-8 rounded-full object-cover" /> : '🔔',
                action: {
                    label: 'Ver',
                    onClick: () => console.log('Notification clicked', payload)
                }
            });
            console.log('Foreground message received:', payload);
        }).catch(err => console.log('Failed: ', err));

        // onMessage returns an unsubscribe function if using the direct firebase API, 
        // but our wrapper returns a promise. 
        // Realistically, the listener stays active. To simple unsubscribe we'd need to refactor service.
        // For now, this simple implementation attaches new listeners on mount.
        // Ideally, move onMessage logic here or make service return unsubscriber.

    }, []);
};

export default useFCM;
