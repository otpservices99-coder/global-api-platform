const Notification = require("../models/Notification");

class NotificationService {


    async send(userId, title, message, type="info") {

        return await Notification.create({

            user: userId,

            title,

            message,

            type

        });

    }


    async broadcast(title, message, type="info") {

        const User = require("../models/User");

        const users = await User.find();

        const notifications = users.map(user => ({

            user:user._id,

            title,

            message,

            type

        }));

        return await Notification.insertMany(
            notifications
        );

    }


}


module.exports = new NotificationService();
