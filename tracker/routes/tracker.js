const express = require('express');
const router = express.Router();
const { Client } = require('pg');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
};

const client = new Client(dbConfig);
client.connect();

/**
 * @swagger
 * tags:
 *  name: Tracker
 * description: track tasks
 */

// add task_tracker entry when a user starts working on a task
router.post('/', async (req, res) => {
    const { taskid, hours } = req.body;
    const createdAtTimestamp = Math.floor(Date.now() / 1000);
    const updatedAtTimestamp = createdAtTimestamp;

    try {
        // Check if the task exists and is not closed
        const taskResult = await client.query('SELECT status FROM tasks WHERE taskid = $1', [taskid]);
        if (taskResult.rows.length === 0) {
            return res.status(400).json({ error: 'Task not found.' });
        }

        const taskStatus = taskResult.rows[0].status;
        if (taskStatus === 'CLOSED') {
            return res.status(400).json({ error: 'Cannot add a tracker to a closed task.' });
        }

        // If the task is not closed, add the tracker
        const result = await client.query('INSERT INTO task_tracker(taskid, hours, created_at, updated_at) VALUES ($1, $2, $3, $4) RETURNING *', [taskid, hours, createdAtTimestamp, updatedAtTimestamp]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error adding tracker:', error);
        res.status(500).json({ error: 'An error occurred while adding the tracker.' });
    }
});

/**
 * @swagger
 * /mytime/tracker:
 *   post:
 *     summary: Add a new tracker entry when a user starts working on a task
 *     tags:
 *       - Tracker
 *     requestBody:
 *       description: Data for creating a new tracker entry
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskid:
 *                 type: integer
 *               hours:
 *                 type: integer
 *             example:
 *               taskid: 1
 *               hours: 2  
 *     responses:
 *       200:
 *         description: Tracker entry added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tracker_id:
 *                   type: integer
 *                 taskid:
 *                   type: integer
 *                 hours:
 *                   type: integer
 *                 created_at:
 *                   type: integer
 *                 updated_at:
 *                   type: integer
 *             example:
 *               tracker_id: 1
 *               taskid: 1
 *               hours: 2
 *               created_at: 1677843540
 *               updated_at: 1677843540
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: Task not found or Cannot add a tracker to a closed task
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: An error occurred while adding the tracker.
 */

// Update tracker hours
router.put('/update/:tracker_id', async (req, res) => {
    const { tracker_id } = req.params;
    const { hours } = req.body; 
    const updated_at = Math.floor(Date.now() / 1000); // Updated timestamp

    try {
        const result = await client.query('UPDATE task_tracker SET hours = $1, updated_at = $2 WHERE tracker_id = $3 RETURNING tracker_id, taskid, hours, updated_at', [hours, updated_at, tracker_id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating tracker:', error);
        res.status(500).json({ error: 'An error occurred while updating the tracker.' });
    }
});

/**
 * @swagger
 * /mytime/tracker/update/{tracker_id}:
 *   put:
 *     summary: Update tracker hours and timestamp when a user updates a tracker
 *     tags:
 *       - Tracker
 *     parameters:
 *       - in: path
 *         name: tracker_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tracker ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hours:
 *                 type: integer
 *             example:
 *               hours: 5
 *     responses:
 *       200:
 *         description: Tracker hours and timestamp updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tracker_id:
 *                   type: integer
 *                 taskid:
 *                   type: integer
 *                 hours:
 *                   type: integer
 *                 updated_at:
 *                   type: integer
 *             example:
 *               tracker_id: 1
 *               taskid: 1
 *               hours: 5
 *               updated_at: 1677843540
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: An error occurred while updating the tracker.
 */

// get all trackers for a task
router.get('/:taskid', async (req, res) => {
    const { taskid } = req.params;

    try {
        const result = await client.query('SELECT * FROM task_tracker WHERE taskid = $1 ORDER BY tracker_id ASC', [taskid]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting trackers:', error);
        res.status(500).json({ error: 'An error occurred while getting the trackers.' });
    }
});

/**
 * @swagger
 * /mytime/tracker/{taskid}:
 *   get:
 *     summary: Get all trackers for a specific task
 *     tags:
 *       - Tracker
 *     parameters:
 *       - in: path
 *         name: taskid
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: List of trackers for the task
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   tracker_id:
 *                     type: integer
 *                   taskid:
 *                     type: integer
 *                   hours:
 *                     type: integer
 *                   created_at:
 *                     type: integer
 *                   updated_at:
 *                     type: integer
 *                 example:
 *                   - tracker_id: 1
 *                     taskid: 1
 *                     hours: 5
 *                     created_at: 1677843540
 *                     updated_at: 1677853540
 *                   - tracker_id: 2
 *                     taskid: 1
 *                     hours: 10
 *                     created_at: 1677844540
 *                     updated_at: 1677863540
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: An error occurred while getting the trackers.
 */

// get all trackers 
router.get('/', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM task_tracker ORDER BY tracker_id ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting trackers:', error);
        res.status(500).json({ error: 'An error occurred while getting the trackers.' });
    }
});

/**
 * @swagger
 * /mytime/tracker:
 *   get:
 *     summary: Get all trackers
 *     tags:
 *       - Tracker
 *     responses:
 *       200:
 *         description: List of all trackers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   tracker_id:
 *                     type: integer
 *                   taskid:
 *                     type: integer
 *                   hours:
 *                     type: integer
 *                   created_at:
 *                     type: integer
 *                   updated_at:
 *                     type: integer
 *                 example:
 *                   - tracker_id: 1
 *                     taskid: 1
 *                     hours: 5
 *                     created_at: 1677843540
 *                     updated_at: 1677853540
 *                   - tracker_id: 2
 *                     taskid: 2
 *                     hours: 10
 *                     created_at: 1677844540
 *                     updated_at: 1677863540
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: An error occurred while getting the trackers.
 */


// get the total hours taken for a task
router.get('/total-hours/:taskid', async (req, res) => {
    const { taskid } = req.params;

    try {
        const result = await client.query('SELECT SUM(hours) as total_hours FROM task_tracker WHERE taskid = $1', [taskid]);
        const totalHours = result.rows[0].total_hours || 0; // If there are no trackers, default to 0 hours
        res.json({ total_hours: totalHours });
    } catch (error) {
        console.error('Error getting total hours for the task:', error);
        res.status(500).json({ error: 'An error occurred while calculating the total hours.' });
    }
});

/**
 * @swagger
 * /mytime/tracker/total-hours/{taskid}:
 *   get:
 *     summary: Get the total hours taken for a task
 *     tags:
 *       - Tracker
 *     parameters:
 *       - in: path
 *         name: taskid
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Total hours calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_hours:
 *                   type: integer
 *             example:
 *               total_hours: 15
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: An error occurred while calculating the total hours.
 */

// Delete a tracker by tracker ID
router.delete('/delete/:tracker_id', async (req, res) => {
    const { tracker_id } = req.params;

    try {
        // Check if the tracker exists
        const trackerResult = await client.query('SELECT * FROM task_tracker WHERE tracker_id = $1', [tracker_id]);
        if (trackerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tracker not found.' });
        }

        // Delete the tracker
        await client.query('DELETE FROM task_tracker WHERE tracker_id = $1', [tracker_id]);

        res.status(200).json({ message: 'Tracker deleted successfully.' });
    } catch (error) {
        console.error('Error deleting tracker:', error);
        res.status(500).json({ error: 'An error occurred while deleting the tracker.' });
    }
});

/**
 * @swagger
 * /mytime/tracker/delete/{tracker_id}:
 *   delete:
 *     summary: Delete a tracker by tracker ID
 *     tags:
 *       - Tracker
 *     parameters:
 *       - in: path
 *         name: tracker_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tracker ID to delete
 *     responses:
 *       200:
 *         description: Tracker deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: Tracker deleted successfully.
 *       404:
 *         description: Tracker not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: Tracker not found.
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: An error occurred while deleting the tracker.
 */

// get total hours for all tasks in a particular month

router.get('/total-hours/:month/:year', async (req, res) => {
    const { month, year } = req.params;

    try {
        const result = await client.query('SELECT SUM(hours) as total_hours FROM task_tracker WHERE EXTRACT(MONTH FROM TO_TIMESTAMP(created_at)) = $1 AND EXTRACT(YEAR FROM TO_TIMESTAMP(created_at)) = $2', [month, year]);
        const totalHours = result.rows[0].total_hours || 0; // If there are no trackers, default to 0 hours
        res.json({ total_hours: totalHours });
    } catch (error) {
        console.error('Error getting total hours for the month:', error);
        res.status(500).json({ error: 'An error occurred while calculating the total hours.' });
    }
});

/**
 * @swagger
 * /mytime/tracker/total-hours/{month}/{year}:
 *   get:
 *     summary: Get total hours for all tasks in a particular month
 *     tags:
 *       - Tracker
 *     parameters:
 *       - in: path
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *         description: Month (1-12)
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: Year (e.g., 2023)
 *     responses:
 *       200:
 *         description: Total hours calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_hours:
 *                   type: integer
 *             example:
 *               total_hours: 45
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: An error occurred while calculating the total hours.
 */


module.exports = router;
