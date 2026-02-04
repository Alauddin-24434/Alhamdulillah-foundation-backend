import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  // Create and send a notification
  async create(createNotificationDto: CreateNotificationDto) {
    const notification = new this.notificationModel(createNotificationDto);
    await notification.save();

    // Broadcast logic
    // 1. If recipient is specified, send to that user's room
    // 2. If no recipient (global), send to all
    
    // if (createNotificationDto.recipient) {
    //    this.appGateway.server.to(createNotificationDto.recipient).emit('receive_notification', notification);
    // } else {
    //    this.appGateway.server.emit('receive_notification', notification);
    // }
    
    return notification;
  }

  // Get all notifications for a user (including global ones)
  async findAllByUser(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    return this.notificationModel
      .find({
        $or: [
          { recipient: userObjectId },
          { recipient: null }, // Global notifications
        ],
      })
      .sort({ createdAt: -1 }) // Newest first
      .limit(50)
      .exec();
  }
  
  // Mark as read
  async markAsRead(id: string) {
      return this.notificationModel.findByIdAndUpdate(id, { isRead: true }, { new: true });
  }
  
  // Mark all as read for logic (bit complex for global, simple for individual)
  // For now simple implementation for individual
  async markAllReadForUser(userId: string) {
       return this.notificationModel.updateMany({ recipient: new Types.ObjectId(userId), isRead: false }, { isRead: true });
  }
}
