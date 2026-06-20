import { NextResponse } from 'next/server';
import { analyzeBasicEssay } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    console.log('Starting basic essay analysis...');
    const { essayText, prompt } = await request.json();
    
    console.log('Calling OpenAI API for basic analysis...');
    const feedback = await analyzeBasicEssay(essayText, prompt);
    console.log('Received feedback from OpenAI:', JSON.stringify(feedback, null, 2));
    
    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Error analyzing basic essay:', error);
    return NextResponse.json(
      { error: 'Failed to analyze basic essay' },
      { status: 500 }
    );
  }
}
