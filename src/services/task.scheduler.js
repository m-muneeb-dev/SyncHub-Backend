const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Task = require('../models/task.model');
const { buildTaskEmail } = require('../utils/email.util');

// 1. Email Transporter Setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// 2. Helper Function: Safe Email Sender
const sendEmail = async (task, type) => {
  try {
    await task.populate('owner_id', 'email name');
    if (!task.owner_id?.email) return;

    const ownerName = task.owner_id.name || 'User';

    const { subject, text, html } = buildTaskEmail({
      type,
      task,
      recipientName: ownerName,
      assignedBy: ownerName
    });

    await transporter.sendMail({
      from: `"SyncHub" <${process.env.SMTP_USER || 'no-reply@yourdomain.com'}>`,
      to: task.owner_id.email,
      subject,
      text,
      html
    });

    console.log(`Email sent (${type}) for: "${task.title}" to ${task.owner_id.email}`);
  } catch (err) {
    console.error(`Failed to send (${type}) email for task "${task.title}":`, err.message);
  }
};

// 3. Cron Job: Rozana Pakistan ke raat 12:00 AM par chalega
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily task notification check (12:00 AM PKT)...');

  try {
    // Pakistan Time (UTC+5) ke mutabiq Aaj raat 12:00 AM ka exact timestamp
    const now = new Date();
    const pktNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);

    const todayStart = new Date(Date.UTC(
      pktNow.getUTCFullYear(),
      pktNow.getUTCMonth(),
      pktNow.getUTCDate(),
      0, 0, 0, 0
    ));
    todayStart.setUTCHours(todayStart.getUTCHours() - 5);

    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    // A. Kal due hone wale tasks (Pre-due)
    const upcomingTasks = await Task.find({
      status: { $ne: 'completed' },
      dueDate: { $gte: tomorrowStart, $lte: tomorrowEnd }
    });

    for (const task of upcomingTasks) {
      await sendEmail(task, 'pre-due');
    }

    // B. Overdue tasks
    const overdueTasks = await Task.find({
      status: { $ne: 'completed' },
      dueDate: { $lt: todayStart }
    });

    for (const task of overdueTasks) {
      await sendEmail(task, 'overdue');
    }

    console.log('Daily task notification check completed.');
  } catch (err) {
    console.error('Cron Error:', err.message);
  }
}, {
  scheduled: true,
  timezone: 'Asia/Karachi'
});