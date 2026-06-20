import { NextResponse } from 'next/server';
import { analyzeIELTSEssay } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    console.log('Starting IELTS essay analysis...');
    const { essayText, taskType, taskContent, imageUrl } = await request.json();
    
    console.log('Calling OpenAI API for IELTS analysis...');
    const feedback = await analyzeIELTSEssay(essayText, taskType, taskContent, imageUrl);
    console.log('Received IELTS feedback from OpenAI:', JSON.stringify(feedback, null, 2));
    
    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Error analyzing IELTS essay:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to analyze IELTS essay', message },
      { status: 500 }
    );
  }
}

