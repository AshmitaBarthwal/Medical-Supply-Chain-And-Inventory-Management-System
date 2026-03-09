const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

// Format alert items for email
const formatAlertItems = (items, type) => {
    if (!items || items.length === 0) return '';

    const typeLabels = {
        lowStock: 'Low Stock Items',
        outOfStock: 'Out of Stock Items',
        expired: 'Expired Items',
        expiringSoon: 'Expiring Soon Items'
    };

    let html = `
        <div style="margin-bottom: 20px;">
            <h3 style="color: #333; margin-bottom: 10px;">${typeLabels[type]} (${items.length})</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #f3f4f6;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Product Name</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Category</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Batch</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Quantity</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Expiry Date</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Status</th>
                    </tr>
                </thead>
                <tbody>
    `;

    items.forEach(item => {
        const statusColor =
            type === 'expired' || type === 'outOfStock' ? '#ef4444' : '#f59e0b';

        html += `
            <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${item.name}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${item.category}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${item.batchNumber}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${item.quantity} units (${item.quantityInCartons || 0} cartons)</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${new Date(item.expiryDate).toLocaleDateString()}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">
                    <span style="color: ${statusColor}; font-weight: 600;">${item.status}</span>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
};

// Send alert email
const sendAlertEmail = async (recipientEmail, alertData) => {
    try {
        const transporter = createTransporter();

        const { lowStock, outOfStock, expired, expiringSoon, summary } = alertData;

        // Build email HTML
        let emailContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">📊 Medico Inventory Alert</h1>
                    <p style="color: #f3f4f6; margin: 10px 0 0 0;">Inventory Status Report</p>
                </div>
                
                <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <div style="margin-bottom: 30px;">
                        <h2 style="color: #333; margin-bottom: 15px;">Summary</h2>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                <div style="font-size: 14px; color: #92400e; margin-bottom: 5px;">Low Stock</div>
                                <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${summary.lowStockCount}</div>
                            </div>
                            <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                                <div style="font-size: 14px; color: #991b1b; margin-bottom: 5px;">Out of Stock</div>
                                <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${summary.outOfStockCount}</div>
                            </div>
                            <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #991b1b;">
                                <div style="font-size: 14px; color: #991b1b; margin-bottom: 5px;">Expired</div>
                                <div style="font-size: 24px; font-weight: bold; color: #991b1b;">${summary.expiredCount}</div>
                            </div>
                            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                <div style="font-size: 14px; color: #92400e; margin-bottom: 5px;">Expiring Soon</div>
                                <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${summary.expiringSoonCount}</div>
                            </div>
                        </div>
                    </div>
        `;

        // Add alert sections
        if (outOfStock && outOfStock.length > 0) {
            emailContent += formatAlertItems(outOfStock, 'outOfStock');
        }

        if (expired && expired.length > 0) {
            emailContent += formatAlertItems(expired, 'expired');
        }

        if (expiringSoon && expiringSoon.length > 0) {
            emailContent += formatAlertItems(expiringSoon, 'expiringSoon');
        }

        if (lowStock && lowStock.length > 0) {
            emailContent += formatAlertItems(lowStock, 'lowStock');
        }

        // Close email HTML
        emailContent += `
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
                        <p>This is an automated alert from Medico Inventory Management System</p>
                        <p style="margin-top: 10px;">Generated on ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Send email
        const mailOptions = {
            from: `"${process.env.EMAIL_FROM || 'Medico Alerts'}" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: `🚨 Medico Inventory Alert - ${summary.totalAlerts} Items Need Attention`,
            html: emailContent
        };

        const info = await transporter.sendMail(mailOptions);

        return {
            success: true,
            messageId: info.messageId,
            message: 'Email sent successfully'
        };
    } catch (error) {
        console.error('Email sending error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    sendAlertEmail
};
