import { NextRequest, NextResponse } from 'next/server'
import { wpAuth, WPApiError } from '@/lib/wp-api'
import type { RegisterTeacherPayload } from '@/types/knowly'

export async function POST(req: NextRequest) {
  try {
    const body: RegisterTeacherPayload = await req.json()
    const { first_name, last_name, email, password, school_name, class_name, phone, principal_name, principal_contact } = body

    if (!first_name || !last_name || !email || !password || !school_name || !class_name || !phone || !principal_name || !principal_contact) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 })
    }

    const data = await wpAuth.registerTeacher({
      first_name, last_name, email, password,
      school_name, class_name, phone, principal_name, principal_contact,
    })

    // Teacher gets no JWT — account is pending_approval
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    if (err instanceof WPApiError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: err.status })
    }
    return NextResponse.json({ message: 'Registration failed' }, { status: 500 })
  }
}
