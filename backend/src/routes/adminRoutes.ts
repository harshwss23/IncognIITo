/**
 * Phase 1 - Admin Dashboard Mock API Endpoints
 *
 * Implemented by:
 * Krish Vijay Tiwari
 *Abeer Gupta
 * Purpose:
 * Provide backend API routes required by the Admin dashboard
 * so that the frontend team can integrate with them.
 *
 * These currently return mock data and will be replaced with
 * real database/session logic in Phase 2.
 */

import { Router, Request, Response } from "express";

const router = Router();

/*
 GET /api/admin/users
 Returns list of fake/mock users for the dashboard
*/
router.get("/users", (_req: Request, res: Response) => {
  const mockUsers = [
    { id: 1, userId: "Krish Vijay Tiwari",  email: "student01@iitk.ac.in", rating: 5.0, status: "active" },
    { id: 2, userId: "Harsh Shekhwat",  email: "student01@iitk.ac.in", rating: 1.0, status: "flagged" },
    { id: 3, userId: "Joel Arora",  email: "student02@iitk.ac.in", rating: 0.0, status: "flagged" },
    { id: 4, userId: "Krish Bansal", email: "student03@iitk.ac.in", rating: 0.1, status: "flagged" },
  ];

  res.json(mockUsers);
});

/*
 GET /api/admin/reports
 Returns list of fake/mock reports for the dashboard
*/
router.get("/reports", (_req: Request, res: Response) => {
  const mockReports = [
    { id: 1, reportId: "R-1024", targetUser: "Reported: Joel Arora",   reason: "Online Harassment",          status: "Pending" },
    { id: 2, reportId: "R-1025", targetUser: "Reported: Krish Bansal",   reason: "Inappropriate Video", status: "Resolved" },
    { id: 3, reportId: "R-1026", targetUser: "Reported: Harsh Shekhwat",  reason: "Inappropriate Behaviour",            status: "Dismissed" },
  ];

  res.json(mockReports);
});

export default router;
