# Smart Share Feature Documentation

## Overview

The Smart Share feature allows users to share their Java code and output with others through unique shareable links and beautiful code images. This feature includes social sharing capabilities with Open Graph metadata for rich link previews.

## Features

### 1. **Share Link**
- Creates a unique short URL for the current code session
- URL format: `https://your-domain.com/s/{unique-id}`
- 30-day expiration
- View counter to track engagement
- Fork & Edit capability for viewers

### 2. **Generate Image**
- Creates a branded 1200x630 code card
- Dark theme with syntax highlighting
- Includes JavaRena branding
- Displays both code and output
- Perfect for social media sharing

### 3. **Security Features**
- XSS prevention through HTML sanitization
- Rate limiting (5 shares per minute per IP)
- Maximum code size limit (50KB)
- Secure unique ID generation using nanoid

### 4. **Social Media Integration**
- Open Graph meta tags for rich previews
- Twitter Card support
- Auto-generated preview images
- Dynamic titles and descriptions

### 5. **Automatic Cleanup**
- Background daemon removes expired sessions
- Deletes associated images
- Runs hourly to maintain database hygiene

## User Interface

### Share Button Location
- Located in the Editor toolbar (top-right corner)
- Icon: Share2 from lucide-react
- Opens the Share Dialog modal

### Share Dialog
Two tabs:
1. **Share Link Tab**
   - Description of shareable link feature
   - "Create Share Link" button
   - Copy, Open, and Create Another actions
   - Fork notification for users

2. **Generate Image Tab**
   - Description of image generation feature
   - "Generate Image" button
   - Image preview with copy and open actions
   - Generate Another option

## API Endpoints

### POST `/api/share`
Creates a new shareable session.

**Request Body:**
```json
{
  "code": "public class Main {...}",
  "output": "Hello World"
}
```

**Response:**
```json
{
  "success": true,
  "id": "abc123xyz9",
  "expires_at": "2026-03-17T12:00:00"
}
```

**Rate Limit:** 5 requests per minute per IP

**Errors:**
- 400: Code empty or too large
- 429: Rate limit exceeded
- 500: Server error

### GET `/api/share/{id}`
Retrieves a shared session and increments view count.

**Response:**
```json
{
  "success": true,
  "code": "public class Main {...}",
  "output": "Hello World",
  "views": 42,
  "created_at": "2026-02-15T12:00:00",
  "expires_at": "2026-03-17T12:00:00"
}
```

**Errors:**
- 404: Share not found
- 410: Share expired
- 500: Server error

### POST `/api/share/image`
Generates a branded code image.

**Request Body:**
```json
{
  "code": "public class Main {...}",
  "output": "Hello World"
}
```

**Response:**
```json
{
  "success": true,
  "image_url": "/share-images/abc123.png",
  "expires_at": "2026-03-17T12:00:00"
}
```

**Rate Limit:** 5 requests per minute per IP

### GET `/s/{id}`
Serves the shared session with Open Graph meta tags.

Returns HTML with injected meta tags and shared session data.

## Database Schema

### Table: `shares`
```sql
CREATE TABLE shares (
    id TEXT PRIMARY KEY,           -- Unique nanoid (10 chars)
    code TEXT NOT NULL,            -- Java source code (HTML sanitized)
    output TEXT,                   -- Program output (HTML sanitized)
    views INTEGER DEFAULT 0,       -- View counter
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,          -- 30 days from creation
    image_path TEXT                -- Path to generated image (if any)
)
```

## File Structure

```
src/
├── components/
│   ├── ShareDialog.tsx          # Share modal component
│   ├── Editor.tsx               # Updated with Share button
│   └── ui/
│       ├── dialog.tsx           # Reusable dialog components
│       ├── button.tsx
│       ├── input.tsx
│       ├── tabs.tsx
│       └── toaster.tsx
├── App.tsx                      # Updated to handle shared sessions
└── hooks/
    └── use-toast.ts             # Toast notifications

server.py                        # Backend with share endpoints
shares.db                        # SQLite database
dist/share-images/              # Generated code images
```

## Usage Examples

### Sharing Code
1. Write your Java code in the editor
2. Click the Share button (share icon) in the toolbar
3. Select "Share Link" tab
4. Click "Create Share Link"
5. Copy the generated URL and share it

### Generating Image
1. Write your Java code in the editor
2. Click the Share button
3. Select "Generate Image" tab
4. Click "Generate Image"
5. Download or copy the image URL

### Viewing Shared Code
1. Open shared URL: `https://your-domain.com/s/{id}`
2. Code automatically loads in the editor
3. Output is displayed in the console
4. Click "Run" to execute the code
5. Edit and create your own version

## Fork & Edit Flow
When a user opens a shared link:
1. Code and output load automatically
2. Welcome message displayed in console
3. User can view the code
4. User can run the code
5. User can edit and save their own version
6. User can create a new share from their modified version

## Configuration

### Rate Limiting
```python
RATE_LIMIT_WINDOW = 60    # seconds
RATE_LIMIT_MAX = 5        # max shares per window
```

### Code Size Limit
```python
MAX_CODE_SIZE = 50000     # 50KB
```

### Expiration
```python
EXPIRES_IN_DAYS = 30
```

### Cleanup Interval
```python
CLEANUP_INTERVAL = 3600   # 1 hour
```

## Dependencies

### Frontend
- React
- @radix-ui/react-dialog
- @radix-ui/react-tabs
- lucide-react (icons)
- shadcn/ui components

### Backend
- Flask
- flask-cors
- Pillow (image generation)
- nanoid (unique ID generation)
- sqlite3 (database)

## Security Considerations

1. **XSS Prevention**: All code and output is HTML-escaped before storage
2. **Rate Limiting**: Prevents abuse through IP-based rate limiting
3. **Size Limits**: Maximum 50KB code size prevents DOS attacks
4. **Expiration**: Automatic cleanup of old shares
5. **Unique IDs**: Cryptographically secure ID generation
6. **SQL Injection**: Parameterized queries prevent injection

## Future Enhancements

- [ ] User accounts for managing shares
- [ ] Custom expiration times
- [ ] Private/password-protected shares
- [ ] Share analytics dashboard
- [ ] Code versioning
- [ ] Collaborative editing
- [ ] Export to GitHub Gist
- [ ] Custom branding options
- [ ] Batch image generation
- [ ] Share to social media directly

## Troubleshooting

### Share button not visible
- Ensure Editor component is properly imported
- Check that Share2 icon is imported from lucide-react

### Share creation fails
- Verify Python dependencies are installed: `pip install Pillow nanoid`
- Check database is initialized: Look for "share database initialized" in logs
- Verify code is not empty and under 50KB

### Image generation fails
- Ensure Pillow is installed
- Check fonts are available (falls back to default)
- Verify dist/share-images directory exists

### Shared link not working
- Check share ID is valid
- Verify share hasn't expired (30 days)
- Check database for the share record

### Rate limit errors
- Wait 60 seconds and try again
- Check if multiple users are sharing from same IP
- Adjust RATE_LIMIT_MAX if needed

## Support

For issues or questions, please refer to:
- GitHub Issues
- Project Documentation
- Server logs for debugging

## License

This feature is part of JavaRena and follows the same license as the main project.
