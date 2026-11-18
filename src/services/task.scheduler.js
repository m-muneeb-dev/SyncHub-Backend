const cron = require('node-cron');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const Task = require('../models/task.model');
const SharedTask = require('../models/shared.task.model');
const { buildTaskEmail } = require('../utils/email.util'); // <-- Importing from utility file

// Configure Email Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Cron Job (Test Mode: every 1 minute using 5 stars)
cron.schedule('0 8 * * *', async () => {
  console.log('Running task notification check (Test Mode)...');

  try {
    const now = new Date();

    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(now.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const logCollection = mongoose.connection.db.collection('task_notification_logs');
    const notCompleted = { status: { $ne: 'completed' } };

    const sendTaskNotification = async (task, type) => {
      await task.populate('owner_id', 'email name');
      if (!task.owner_id || !task.owner_id.email) return false;

      const ownerEmail = task.owner_id.email;

      const sharedTasks = await SharedTask.find({ task_id: task._id })
        .populate('collaborator', 'email')
        .populate('shared_by', 'email name');

      const collaboratorEmails = sharedTasks
        .map(st => st.collaborator?.email)
        .filter(Boolean);

      const sharedByName = sharedTasks[0]?.shared_by?.name || task.owner_id.name || 'Owner';

      // Using the imported email template helper
      const { subject, text, html } = buildTaskEmail({
        type,
        task,
        recipientName: task.owner_id.name,
        assignedBy: sharedByName
      });

      const mailOptions = {
        from: '"SyncHub" <no-reply@yourdomain.com>',
        to: ownerEmail,
        subject,
        text,
        html
      };

      if (collaboratorEmails.length > 0) {
        mailOptions.cc = collaboratorEmails;
      }

      await transporter.sendMail(mailOptions);
      console.log(`Email sent (${type}) for task: "${task.title}" to Owner (${ownerEmail})`);
      return true;
    };

    const notifyOnce = async (task, type) => {
      try {
        const alreadyNotified = await logCollection.findOne({ task_id: task._id, type });
        if (alreadyNotified) return;

        const sent = await sendTaskNotification(task, type);
        if (!sent) return;

        await logCollection.insertOne({
          task_id: task._id,
          type,
          sent_at: new Date()
        });
      } catch (err) {
        console.error(`Failed to send (${type}) notification for task ${task._id}:`, err.message);
      }
    };

    // A. Check "Due Tomorrow" Tasks
    const upcomingTasks = await Task.find({
      ...notCompleted,
      dueDate: { $gte: tomorrowStart, $lte: tomorrowEnd }
    });

    for (const task of upcomingTasks) {
      await notifyOnce(task, 'pre-due');
    }

    // B. Check "Overdue" Tasks
    const overdueTasks = await Task.find({
      ...notCompleted,
      dueDate: { $lt: todayStart }
    });

    for (const task of overdueTasks) {
      await notifyOnce(task, 'overdue');
    }

    console.log('Task notifications check completed.');
  } catch (err) {
    console.error('Error in task notification scheduler:', err);
  }
}, {
  scheduled: true,
  timezone: "UTC"
});