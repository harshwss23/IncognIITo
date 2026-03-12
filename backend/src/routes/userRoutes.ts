// FILE: src/routes/userRoutes.ts
// PURPOSE: User profile management routes
// WHAT IT DOES:
// - Handles user profile updates
// - Manages user settings
// - All routes are protected (require authentication)


import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { query } from "../config/database";

const router = Router();

// All routes require authentication
router.use(authMiddleware.authenticate.bind(authMiddleware));

/*
GET /api/users/profile
Returns logged in user's profile
*/
router.get("/profile", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query(
      `SELECT u.id, u.email, u.display_name, u.verified,
              p.interests, p.avatar_url, p.total_chats, p.total_reports, p.rating, p.is_banned
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Profile fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch profile"
    });
  }
});


/*
PUT /api/users/profile
Update profile
*/
router.put("/profile", async (req: Request, res: Response) => {
  try {

    const userId = req.user!.userId;
    const { displayName, interests, avatarUrl } = req.body;

    if (displayName) {
      await query(
        "UPDATE users SET display_name = $1 WHERE id = $2",
        [displayName, userId]
      );
    }

    await query(
      `UPDATE user_profiles
       SET interests = COALESCE($1, interests),
           avatar_url = COALESCE($2, avatar_url)
       WHERE user_id = $3`,
      [interests, avatarUrl, userId]
    );

    res.json({
      success: true,
      message: "Profile updated"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Profile update failed"
    });

  }
});


/*
GET /api/users/connection-requests
Mock endpoint for dashboard
*/
// GET /api/users/connection-requests
router.get("/connection-requests", async (_req: Request, res: Response) => {
  try {

    const requests = [
      {
        id: 1,
        userId: "MaskedSoul",
        matchScore: 95,
        sharedTags: ["CS253", "Anime", "Competitive Programming"]
      },
      {
        id: 2,
        userId: "PixelShade",
        matchScore: 88,
        sharedTags: ["Machine Learning", "Photography", "Cricket"]
      },
      {
        id: 3,
        userId: "ShadowKey",
        matchScore: 92,
        sharedTags: ["Game Dev", "CS251", "Music Production"]
      },
      {
        id: 4,
        userId: "DarkSignal",
        matchScore: 85,
        sharedTags: ["Robotics", "Physics", "Chess"]
      },
      {
        id: 5,
        userId: "SilentUser",
        matchScore: 90,
        sharedTags: ["Web Dev", "Startup Ideas", "Basketball"]
      },
      {
        id: 6,
        userId: "IncognitoX",
        matchScore: 87,
        sharedTags: ["AI Ethics", "Philosophy", "Debate"]
      }
    ];

    res.json({
      success: true,
      data: requests
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Failed to fetch connection requests"
    });

  }
});


/*
GET /api/users/active-chats
Mock endpoint
*/
router.get("/active-chats", (_req: Request, res: Response) => {

  res.json({
    success: true,
    data: [
      {
        chatId: "chat1",
        user: "Anonymous 512",
        lastMessage: "That sounds interesting!",
        timestamp: "2 min ago"
      }
    ]
  });

});


/*
POST /api/users/start-matching
Adds user to queue
*/
router.post("/start-matching", (req: Request, res: Response) => {

  const userId = req.user!.userId;

  res.json({
    success: true,
    message: "User added to matchmaking queue",
    userId
  });

});

export default router;