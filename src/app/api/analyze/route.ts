import { NextResponse } from 'next/server';
import { analyzeEssay } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    console.log('Starting essay analysis...');
    const { essayText, readingPassage, listeningPassage } = await request.json();
    
    console.log('Calling OpenAI API...');
    const feedback = await analyzeEssay(essayText, readingPassage, listeningPassage);
    console.log('Received feedback from OpenAI:', JSON.stringify(feedback, null, 2));
    
    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Error analyzing essay:', error);
    return NextResponse.json(
      { error: 'Failed to analyze essay' },
      { status: 500 }
    );
  }
} 