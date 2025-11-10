import { exec } from 'child_process';
import { promisify } from 'util';
import { NextResponse } from 'next/server';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    // Simple auth check - require a secret token
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.MIGRATION_SECRET || 'change-me-in-production';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting database migration...');

    // Run Prisma migrations
    const { stdout, stderr } = await execAsync(
      'npx prisma migrate deploy',
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
        timeout: 60000, // 60 second timeout
      }
    );

    console.log('Migration output:', stdout);
    if (stderr) console.error('Migration stderr:', stderr);

    return NextResponse.json({
      success: true,
      message: 'Migrations completed successfully',
      output: stdout,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        output: error.stdout,
        stderr: error.stderr,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check migration status
export async function GET() {
  try {
    const { stdout } = await execAsync(
      'npx prisma migrate status',
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
        timeout: 30000,
      }
    );

    return NextResponse.json({
      success: true,
      status: stdout,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        output: error.stdout,
        stderr: error.stderr,
      },
      { status: 500 }
    );
  }
}
