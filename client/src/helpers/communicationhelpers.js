import { NOTIFICATION_TYPES } from "../components/notification/notification";
import { socket } from "../components/sockets/socket";

export const socketEmit = (eventName, paramsObject) => {
    socket.emit(eventName, paramsObject);
};

export const socketOn = (eventName, callback, notificationParams = {}) => {
    const { fireNotification } = notificationParams;

    socket.on(eventName, (data) => {
        console.log("Received event", eventName);
        callback(data);

        /*
        const notification = {
            text: `Testi notifikaatio, päivitetty data: ${
                data.game ? "game" : ""
            } ${data.players ? "players" : ""} ${data.player ? "player" : ""} ${
                data.options ? "options" : ""
            }`,
            type: NOTIFICATION_TYPES.DEFAULT,
            time: 200,
        };
        */
        const notification = data?.notification;

        if (notification && fireNotification) {
            fireNotification(notification, notification.time);
        }
    });
};
