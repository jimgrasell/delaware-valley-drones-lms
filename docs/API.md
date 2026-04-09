# Delaware Valley Drones - API Documentation

**API Version:** v1  
**Base URL:** `https://api.delawarevalleydrones.com/api/v1` (production)  
**Base URL:** `http://localhost:3000/api/v1` (development)  
**Protocol:** REST with JSON payloads  
**Authentication:** JWT Bearer tokens  

---

## Table of Contents
1. [Authentication](#authentication)
2. [Error Handling](#error-handling)
3. [Rate Limiting](#rate-limiting)
4. [Public Endpoints](#public-endpoints)
5. [Authentication Endpoints](#authentication-endpoints)
6. [Student Endpoints](#student-endpoints)
7. [Chapter Endpoints](#chapter-endpoints)
8. [Quiz Endpoints](#quiz-endpoints)
9. [Forum Endpoints](#forum-endpoints)
10. [Payment Endpoints](#payment-endpoints)
11. [Instructor/Admin Endpoints](#instructoradmin-endpoints)

---

## Authentication

### JWT Token Format

All authenticated requests must include:
```
Authorization: Bearer <jwt_token>
```

**Token Details:**
- **Type:** HS256 signed JWT
- **Payload:**
  ```json
  {
    "sub": "user_id",
    "email": "student@example.com",
    "role": "student",
    "iat": 1704067200,
    "exp": 1704153600
  }
  ```
- **Expiration:** 24 hours
- **Refresh:** Via refresh token endpoint (stored in httpOnly cookie)

### Token Refresh Flow

```
Client sends: /auth/login → Get access_token + refresh_token (httpOnly cookie)
              After 24h: /auth/refresh → New access_token automatically
              After 30 days: /auth/login again → New refresh_token
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Invalid credentials",
    "details": "Email not found in system"
  }
}
```

### Common Error Codes

| Code | Status | Message | Solution |
|------|--------|---------|----------|
| `AUTH_001` | 401 | Invalid credentials | Check email/password |
| `AUTH_002` | 401 | Token expired | Call /auth/refresh |
| `AUTH_003` | 403 | Insufficient permissions | User doesn't have required role |
| `VALIDATION_001` | 400 | Invalid input | Check field requirements |
| `PAYMENT_001` | 402 | Payment declined | Try different card |
| `NOT_FOUND_001` | 404 | Resource not found | Check ID format |
| `RATE_LIMIT_001` | 429 | Too many requests | Wait 60 seconds |
| `SERVER_001` | 500 | Internal server error | Contact support |

---

## Rate Limiting

**Limits:**
- **Authentication endpoints:** 5 requests per minute per IP
- **Quiz submission:** 1 request per 10 seconds per user
- **Forum posts:** 10 requests per minute per user
- **API calls (general):** 100 requests per minute per user

**Headers in Response:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1704153600
```

---

## Public Endpoints

### GET /public/landing-data
Get data for landing page (no authentication required).

**Response:**
```json
{
  "success": true,
  "data": {
    "course": {
      "title": "FAA Part 107 Remote Pilot Certification",
      "price": 9999,
      "currency": "USD",
      "chapters_count": 13,
      "questions_count": 113
    },
    "instructor": {
      "name": "James Grasell",
      "bio": "UAS Remote Pilot Certified, NIST level 1-3 certified...",
      "credentials": "4 years flying experience, 3 years teaching...",
      "photo_url": "https://s3.aws.com/instructor.jpg"
    },
    "testimonials": [
      {
        "author": "John Doe",
        "text": "Great course, very comprehensive!",
        "rating": 5
      }
    ],
    "faq": [
      {
        "question": "How long is the course?",
        "answer": "Typically 4-6 weeks depending on pace"
      }
    ]
  }
}
```

---

### GET /public/syllabus
Get complete course syllabus (all 13 chapters overview).

**Response:**
```json
{
  "success": true,
  "data": {
    "chapters": [
      {
        "number": 1,
        "title": "Introduction to Part 107",
        "description": "Overview of FAA regulations...",
        "estimated_time_minutes": 45
      },
      {
        "number": 2,
        "title": "Aerodynamics & Flight Physics",
        "description": "Understand how drones fly..."
      }
      // ... 11 more chapters
    ]
  }
}
```

---

## Authentication Endpoints

### POST /auth/register
Register a new student account.

**Request:**
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Validation:**
- Email: valid format, unique
- Password: ≥8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special
- Names: 2-100 chars

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid-here",
    "email": "student@example.com",
    "first_name": "John",
    "message": "Verification email sent. Please check your inbox."
  }
}
```

**Email Sent:** Verification link (expires in 24 hours)

---

### POST /auth/verify-email
Confirm email address via link from registration email.

**Request:**
```json
{
  "token": "email_verification_token_from_email"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified. Your account is now active."
}
```

---

### POST /auth/login
Student login with email and password.

**Request:**
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "user": {
      "id": "user-uuid",
      "email": "student@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "student"
    }
  }
}
```

**Cookies Set:**
- `refresh_token` (httpOnly, Secure, SameSite=Strict, expires in 30 days)

**Error Cases:**
- `AUTH_001` (401): Invalid email/password
- `AUTH_004` (403): Account not verified yet
- `AUTH_005` (403): Account suspended

---

### POST /auth/logout
Invalidate current session and refresh token.

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Cookies Cleared:**
- `refresh_token` removed

---

### POST /auth/refresh
Get a new access token using refresh token.

**Request:**
```json
{}
```

**Headers:**
- Refresh token sent automatically in cookie

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "expires_in": 86400
  }
}
```

---

### POST /auth/forgot-password
Request password reset email.

**Request:**
```json
{
  "email": "student@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If email exists, password reset link sent"
}
```

**Email Sent:** Reset link with token (expires in 1 hour)

**Security Note:** Returns same response whether email exists or not (prevent email enumeration)

---

### POST /auth/reset-password
Complete password reset with token from email.

**Request:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass456!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully. Please login with new password."
}
```

---

## Student Endpoints

All endpoints require `Authorization: Bearer <token>` header.

### GET /students/dashboard
Get student dashboard data (progress, chapters, stats).

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    },
    "overall_progress": 38,
    "chapters_completed": 5,
    "chapters_total": 13,
    "chapters": [
      {
        "number": 1,
        "title": "Introduction to Part 107",
        "status": "completed",
        "video_watched": true,
        "quiz_passed": true,
        "completed_at": "2026-04-05T14:32:00Z",
        "progress": 100
      },
      {
        "number": 2,
        "title": "Aerodynamics & Flight Physics",
        "status": "in_progress",
        "video_watched": true,
        "quiz_passed": false,
        "progress": 50
      },
      {
        "number": 3,
        "title": "Regulations & Compliance",
        "status": "locked",
        "progress": 0
      }
      // ... more chapters
    ],
    "certificate_progress": {
      "chapters_needed": 13,
      "chapters_completed": 5,
      "completion_percentage": 38
    },
    "stats": {
      "total_time_spent_hours": 12.5,
      "average_quiz_score": 82,
      "last_activity": "2026-04-09T10:15:00Z"
    }
  }
}
```

---

### GET /students/profile
Get student profile details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "avatar_url": "https://s3.aws.com/avatars/user123.jpg",
    "created_at": "2026-03-15T10:00:00Z",
    "enrollment": {
      "status": "active",
      "enrolled_at": "2026-03-15T10:00:00Z"
    }
  }
}
```

---

### PUT /students/profile
Update student profile (name, avatar).

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "avatar_file": "base64_image_data"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "first_name": "John",
    "last_name": "Smith",
    "avatar_url": "https://s3.aws.com/avatars/user123.jpg"
  }
}
```

---

### GET /students/progress
Get detailed progress tracking (per chapter).

**Response:**
```json
{
  "success": true,
  "data": {
    "overall_progress": 38,
    "chapters": [
      {
        "chapter_id": "ch-1-uuid",
        "chapter_number": 1,
        "chapter_title": "Introduction to Part 107",
        "video_watched": true,
        "quiz_passed": true,
        "quiz_score": 95,
        "time_spent_minutes": 45,
        "completed_at": "2026-04-05T14:32:00Z",
        "quiz_attempts": 1
      },
      {
        "chapter_id": "ch-2-uuid",
        "chapter_number": 2,
        "chapter_title": "Aerodynamics",
        "video_watched": true,
        "quiz_passed": false,
        "quiz_score": 65,
        "time_spent_minutes": 30,
        "quiz_attempts": 1
      }
      // ... all chapters
    ]
  }
}
```

---

### GET /students/gradebook
Get detailed grade breakdown (for personal records).

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollments_count": 1,
    "overall_grade_average": 82.3,
    "chapters": [
      {
        "chapter_number": 1,
        "quiz_score": 95,
        "status": "complete",
        "date_completed": "2026-04-05"
      },
      {
        "chapter_number": 2,
        "quiz_score": 65,
        "status": "incomplete",
        "last_attempt_date": "2026-04-06"
      }
    ],
    "practice_exam": {
      "highest_score": 88,
      "attempts": [
        {
          "score": 88,
          "date": "2026-04-08",
          "time_taken_minutes": 95
        },
        {
          "score": 82,
          "date": "2026-04-06",
          "time_taken_minutes": 110
        }
      ]
    }
  }
}
```

---

### GET /students/certificate
Get completion certificate (if course is 100% complete).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "certificate_number": "CERT-2026-ABC123XYZ",
    "student_name": "John Doe",
    "issued_date": "2026-04-09T00:00:00Z",
    "pdf_url": "https://s3.aws.com/certificates/cert123.pdf",
    "verification_url": "https://delawarevalleydrones.com/verify/cert-token-here",
    "can_download": true,
    "can_print": true
  }
}
```

**Error (if not complete):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_ELIGIBLE_001",
    "message": "Course not yet complete",
    "details": "You have completed 5 of 13 chapters"
  }
}
```

---

## Chapter Endpoints

### GET /chapters
List all chapters with student's current progress.

**Query Parameters:**
- `page` (optional): Default 1
- `limit` (optional): Default 10

**Response:**
```json
{
  "success": true,
  "data": {
    "chapters": [
      {
        "id": "ch-1-uuid",
        "number": 1,
        "title": "Introduction to Part 107",
        "description": "Comprehensive overview...",
        "status": "completed",
        "video_watched": true,
        "quiz_passed": true,
        "is_locked": false,
        "completed_at": "2026-04-05T14:32:00Z"
      },
      {
        "id": "ch-2-uuid",
        "number": 2,
        "title": "Aerodynamics & Flight Physics",
        "status": "in_progress",
        "is_locked": false,
        "video_watched": true,
        "quiz_passed": false
      },
      {
        "id": "ch-3-uuid",
        "number": 3,
        "title": "Regulations & Compliance",
        "status": "locked",
        "is_locked": true,
        "message": "Complete Chapter 2 to unlock"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_chapters": 13
    }
  }
}
```

---

### GET /chapters/{id}
Get full chapter content (video, PDF, summary, quiz).

**Response:**
```json
{
  "success": true,
  "data": {
    "chapter": {
      "id": "ch-1-uuid",
      "number": 1,
      "title": "Introduction to Part 107",
      "description": "FAA regulations for Part 107 remote pilots...",
      "is_locked": false
    },
    "content": {
      "video": {
        "url": "https://vimeo.com/xxxxx",
        "embed_html": "<iframe src='https://player.vimeo.com/video/xxxxx' ...>",
        "title": "Part 107 Introduction",
        "duration_seconds": 1234,
        "watched": true,
        "progress_percentage": 100
      },
      "pdf": {
        "url": "https://s3.aws.com/pdfs/ch1.pdf",
        "title": "Chapter 1 Study Guide",
        "downloadable": true
      },
      "summary": {
        "text": "Key takeaways: 1) The Part 107 applies to...",
        "key_points": [
          "Point 1",
          "Point 2"
        ]
      }
    },
    "quiz": {
      "id": "quiz-1-uuid",
      "title": "Chapter 1 Quiz",
      "questions_count": 10,
      "passing_score": 70,
      "time_limit_minutes": 20,
      "max_attempts": 3,
      "attempts_used": 1,
      "best_score": 95,
      "can_retake": true
    }
  }
}
```

---

### POST /chapters/{id}/video-watch
Mark video as watched (call when video reaches 90% completion).

**Request:**
```json
{
  "progress_percentage": 95,
  "watched_seconds": 1200
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "video_marked_complete": true,
    "progress_percentage": 100
  }
}
```

---

## Quiz Endpoints

### GET /quizzes/{id}
Get quiz questions (randomized order if enabled).

**Response:**
```json
{
  "success": true,
  "data": {
    "quiz": {
      "id": "quiz-1-uuid",
      "title": "Chapter 1 Knowledge Check",
      "passing_score": 70,
      "time_limit_minutes": 20,
      "questions_count": 10,
      "started_at": "2026-04-09T10:15:00Z"
    },
    "questions": [
      {
        "id": "q-1-uuid",
        "question_text": "What is the maximum altitude for Part 107 flights?",
        "type": "single_choice",
        "options": [
          {
            "id": "opt-1-uuid",
            "text": "100 feet"
          },
          {
            "id": "opt-2-uuid",
            "text": "400 feet above ground level"
          },
          {
            "id": "opt-3-uuid",
            "text": "500 feet above ground level"
          },
          {
            "id": "opt-4-uuid",
            "text": "1000 feet"
          }
        ]
      },
      {
        "id": "q-2-uuid",
        "question_text": "Select all that apply: Which are Part 107 requirements?",
        "type": "multi_select",
        "options": [
          {
            "id": "opt-5-uuid",
            "text": "Must be at least 16 years old"
          },
          {
            "id": "opt-6-uuid",
            "text": "Must maintain visual line of sight"
          },
          {
            "id": "opt-7-uuid",
            "text": "Can fly at night without waiver"
          },
          {
            "id": "opt-8-uuid",
            "text": "Remote pilot must be present at site"
          }
        ]
      }
      // ... more questions
    ]
  }
}
```

---

### POST /quizzes/{id}/submit
Submit quiz answers and get scored result.

**Request:**
```json
{
  "answers": {
    "q-1-uuid": "opt-2-uuid",
    "q-2-uuid": ["opt-5-uuid", "opt-6-uuid", "opt-8-uuid"],
    "q-3-uuid": "opt-10-uuid"
  },
  "time_taken_seconds": 1200
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "attempt": {
      "id": "attempt-1-uuid",
      "quiz_id": "quiz-1-uuid",
      "score": 80,
      "passed": true,
      "passing_score": 70,
      "correct_answers": 8,
      "total_questions": 10,
      "time_taken_seconds": 1200,
      "completed_at": "2026-04-09T10:45:00Z"
    },
    "feedback": {
      "message": "Congratulations! You passed!",
      "score_text": "Score: 80/100 (8/10 correct)"
    },
    "chapter_progress": {
      "quiz_passed": true,
      "can_proceed_to_next_chapter": true
    },
    "detailed_review": [
      {
        "question_number": 1,
        "question_text": "What is the maximum altitude...",
        "student_answer": "opt-2-uuid",
        "correct_answer": "opt-2-uuid",
        "is_correct": true,
        "explanation": "Correct! Part 107 limits altitude to 400 feet AGL."
      },
      {
        "question_number": 2,
        "student_answers": ["opt-5-uuid", "opt-6-uuid"],
        "correct_answers": ["opt-5-uuid", "opt-6-uuid", "opt-8-uuid"],
        "is_correct": false,
        "explanation": "You missed: Remote pilot must be present at site. Correct answers: Age 16+, VLOS, Pilot present."
      }
    ]
  }
}
```

---

### GET /quizzes/{id}/attempts
Get student's past quiz attempts.

**Response:**
```json
{
  "success": true,
  "data": {
    "quiz_id": "quiz-1-uuid",
    "quiz_title": "Chapter 1 Quiz",
    "attempts": [
      {
        "id": "attempt-3-uuid",
        "score": 95,
        "passed": true,
        "completed_at": "2026-04-09T10:45:00Z",
        "time_taken_seconds": 900
      },
      {
        "id": "attempt-2-uuid",
        "score": 75,
        "passed": true,
        "completed_at": "2026-04-08T14:20:00Z",
        "time_taken_seconds": 1200
      },
      {
        "id": "attempt-1-uuid",
        "score": 65,
        "passed": false,
        "completed_at": "2026-04-07T16:00:00Z",
        "time_taken_seconds": 1800
      }
    ],
    "best_score": 95,
    "average_score": 78.3,
    "total_attempts": 3,
    "can_retake": true
  }
}
```

---

## Forum Endpoints

### GET /forum/chapters/{chapter_id}/posts
Get all Q&A posts for a chapter.

**Query Parameters:**
- `page`: Default 1
- `limit`: Default 10
- `sort`: "recent" | "popular" | "unanswered"

**Response:**
```json
{
  "success": true,
  "data": {
    "chapter_id": "ch-1-uuid",
    "posts": [
      {
        "id": "post-1-uuid",
        "title": "What does VLOS mean?",
        "author": {
          "name": "John Doe",
          "avatar_url": "..."
        },
        "created_at": "2026-04-06T10:15:00Z",
        "is_answered": true,
        "replies_count": 3,
        "helpful_count": 8
      },
      {
        "id": "post-2-uuid",
        "title": "Can I fly at night?",
        "author": { ... },
        "created_at": "2026-04-07T14:30:00Z",
        "is_answered": false,
        "replies_count": 0
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_posts": 28
    }
  }
}
```

---

### POST /forum/posts
Create a new forum post (question).

**Request:**
```json
{
  "chapter_id": "ch-1-uuid",
  "title": "How do I pass the Part 107 exam?",
  "content": "I've taken it twice and failed. Any study tips?"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "post-3-uuid",
    "chapter_id": "ch-1-uuid",
    "title": "How do I pass the Part 107 exam?",
    "content": "...",
    "author_id": "user-uuid",
    "created_at": "2026-04-09T12:00:00Z",
    "is_answered": false,
    "replies_count": 0
  }
}
```

---

### POST /forum/posts/{post_id}/replies
Reply to a forum post.

**Request:**
```json
{
  "content": "Here are the key areas to focus on: 1) Airspace... 2) Weather..."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "reply-1-uuid",
    "post_id": "post-3-uuid",
    "author": {
      "id": "user-uuid",
      "name": "James Grasell",
      "is_instructor": true
    },
    "content": "Here are the key areas...",
    "created_at": "2026-04-09T12:30:00Z"
  }
}
```

---

### DELETE /forum/posts/{id}
Delete own forum post (post author only).

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post deleted"
}
```

---

## Payment Endpoints

### POST /payments/checkout-session
Create Stripe checkout session.

**Request:**
```json
{
  "coupon_code": "SUMMER20"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "session_id": "cs_test_xxxxx",
    "client_secret": "pi_xxxxx_secret_xxxxx",
    "stripe_public_key": "pk_test_xxxxx",
    "amount": 7999,
    "currency": "USD",
    "description": "FAA Part 107 Course - Delaware Valley Drones",
    "discount_applied": 20,
    "discount_amount": 2000,
    "final_amount": 7999
  }
}
```

**Frontend:** Use Stripe Elements or Stripe.js to complete payment.

---

### GET /payments/webhook
Stripe webhook handler (called by Stripe, not your client).

**Stripe Event Types Handled:**
- `payment_intent.succeeded` → Create enrollment, send confirmation email
- `charge.refunded` → Mark enrollment as refunded
- `customer.subscription.deleted` → Suspend enrollment

---

### POST /payments/validate-coupon
Validate and preview coupon discount.

**Request:**
```json
{
  "coupon_code": "SUMMER20"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "coupon_code": "SUMMER20",
    "discount_type": "percent",
    "discount_value": 20,
    "description": "20% off, expires Dec 31",
    "original_price": 9999,
    "discount_amount": 2000,
    "final_price": 7999,
    "valid": true
  }
}
```

**Error (invalid/expired coupon):**
```json
{
  "success": false,
  "error": {
    "code": "COUPON_001",
    "message": "Coupon not found or expired"
  }
}
```

---

## Instructor/Admin Endpoints

All require `Authorization: Bearer <token>` + `role: instructor` or `role: admin`.

### GET /admin/students
Get list of all enrolled students with filters.

**Query Parameters:**
- `page`: Default 1
- `limit`: Default 20
- `search`: Filter by name/email
- `status`: "active" | "refunded" | "suspended"
- `sort`: "enrolled_date" | "progress" | "name"

**Response:**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "user-uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "enrolled_date": "2026-03-15",
        "status": "active",
        "progress": 38,
        "chapters_completed": 5,
        "average_quiz_score": 82.3,
        "last_activity": "2026-04-09T10:15:00Z"
      },
      {
        "id": "user-uuid-2",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "enrolled_date": "2026-04-01",
        "status": "active",
        "progress": 8,
        "chapters_completed": 1,
        "average_quiz_score": 75,
        "last_activity": "2026-04-08T14:20:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_students": 97
    },
    "summary": {
      "total_enrolled": 97,
      "active": 87,
      "refunded": 10,
      "average_progress": 42,
      "average_score": 79.5
    }
  }
}
```

---

### GET /admin/students/{id}
Get individual student's detailed gradebook and activity.

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "enrolled_date": "2026-03-15T10:00:00Z",
      "status": "active",
      "total_time_hours": 12.5
    },
    "progress_by_chapter": [
      {
        "chapter_number": 1,
        "title": "Introduction to Part 107",
        "video_watched": true,
        "quiz_score": 95,
        "attempts": 1,
        "completed_at": "2026-04-05T14:32:00Z"
      },
      {
        "chapter_number": 2,
        "title": "Aerodynamics",
        "video_watched": true,
        "quiz_score": 65,
        "attempts": 1,
        "completed_at": null
      },
      {
        "chapter_number": 3,
        "video_watched": false,
        "quiz_score": null
      }
    ],
    "practice_exam": {
      "highest_score": 88,
      "attempts_count": 2
    },
    "overall_average_score": 82.3,
    "last_activity": "2026-04-09T10:15:00Z"
  }
}
```

---

### PUT /admin/chapters/{id}
Update chapter details (title, description, video URL, PDF URL).

**Request:**
```json
{
  "title": "Introduction to Part 107 (Updated)",
  "description": "New description...",
  "video_url": "https://vimeo.com/xxxxx",
  "pdf_url": "https://s3.aws.com/pdfs/ch1-v2.pdf"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "chapter": {
      "id": "ch-1-uuid",
      "number": 1,
      "title": "Introduction to Part 107 (Updated)",
      "description": "...",
      "video_url": "...",
      "pdf_url": "..."
    }
  }
}
```

---

### GET /admin/analytics
Get course analytics dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollments": {
      "total": 97,
      "active": 87,
      "refunded": 10,
      "this_month": 12
    },
    "revenue": {
      "total": 8910.03,
      "this_month": 1199.88,
      "currency": "USD"
    },
    "progress": {
      "average_completion": 42,
      "completed_full_course": 8,
      "abandoned": 2
    },
    "quiz_performance": {
      "average_score": 79.5,
      "average_attempts": 1.3,
      "highest_score_chapter": { "chapter": 1, "score": 89.2 },
      "lowest_score_chapter": { "chapter": 13, "score": 71.4 }
    },
    "student_engagement": {
      "daily_active_users": 23,
      "weekly_active_users": 65,
      "last_30_day_active": 82
    }
  }
}
```

---

### POST /admin/announcements
Create course-wide announcement.

**Request:**
```json
{
  "title": "Exam Tips",
  "content": "Remember to review the weather section before the exam...",
  "is_published": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "announcement-1-uuid",
    "title": "Exam Tips",
    "content": "...",
    "created_at": "2026-04-09T12:00:00Z",
    "is_published": true
  }
}
```

**Email Sent:** To all active students

---

## Rate Limit Headers Example

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1704153600
```

---

## CORS Configuration

**Allowed Origins:**
- `https://delawarevalleydrones.com`
- `https://www.delawarevalleydrones.com`
- `http://localhost:3000` (development)

**Allowed Methods:**
- GET, POST, PUT, DELETE, PATCH, OPTIONS

**Allowed Headers:**
- Authorization, Content-Type, Accept

---

## Webhook Security

**Stripe Webhook:**
- Endpoint: `POST /payments/webhook`
- Verify signature using Stripe secret key
- Log all webhook events
- Retry failed webhook processing (Stripe retries up to 5 times)

---

**API Version:** 1.0  
**Last Updated:** April 2026  
**Status:** DRAFT (Ready for backend implementation)
