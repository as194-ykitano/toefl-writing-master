import { Task } from './types';

export const getSampleTOEFLAcademicDiscussionTasks = (): Task[] => {
  return [
    {
      id: "toefl-academic-discussion-sample-1",
      title: "TOEFL Academic Discussion: リモートワークの影響",
      description: "リモートワークが社会に与える影響について、教授と学生のディスカッションを読んで自分の意見を述べる",
      type: "independent",
      taskType: "academic_discussion",
      difficulty: "中級",
      category: "Academic Discussion",
      timeLimit: 10, // 10分
      status: "not_started",
      createdAt: new Date(),
      wordCount: {
        min: 100,
        target: 150
      },
      discussionContent: {
        professor: "Today we're discussing the impact of remote work on society. Remote work has become increasingly common, especially after the pandemic. Let's explore both the positive and negative aspects of this trend. What do you think about the overall impact of remote work on society? Do you believe the benefits outweigh the challenges, or vice versa? Please explain your position with specific examples.",
        student1: "I think remote work is mostly positive. It gives people more flexibility and work-life balance. My parents both work from home now, and they can spend more time with family. Also, it reduces commuting time and environmental pollution.",
        student2: "But I see some problems with remote work. It can be isolating and make collaboration harder. In my internship, I noticed that team communication was more difficult when everyone was working from different locations. Also, not everyone has a good home office setup.",
        question: "What do you think about the overall impact of remote work on society? Do you believe the benefits outweigh the challenges, or vice versa?",
        professorName: "Doctor Gupta",
        student1Name: "Kelly",
        student2Name: "Andrew"
      },
      instructions: "ディスカッションの内容を読んで、リモートワークの社会的影響についてあなたの意見を100語以上で述べてください。教授や他の学生の意見を参考にしながら、建設的な議論に参加してください。"
    },
    {
      id: "toefl-academic-discussion-sample-2",
      title: "TOEFL Academic Discussion: 人工知能の教育への影響",
      description: "AI技術が教育分野に与える影響について、教授と学生のディスカッションを読んで自分の意見を述べる",
      type: "independent",
      taskType: "academic_discussion",
      difficulty: "上級",
      category: "Academic Discussion",
      timeLimit: 10,
      status: "not_started",
      createdAt: new Date(),
      wordCount: {
        min: 100,
        target: 150
      },
      discussionContent: {
        professor: "Artificial intelligence is rapidly changing many industries, including education. AI tools like ChatGPT and personalized learning systems are becoming more common in classrooms. Let's discuss how this technology might affect teaching and learning. How do you think AI will change education in the next decade? What are the most important benefits and challenges we should consider? Please provide specific examples to support your viewpoint.",
        student1: "AI can make education more personalized and efficient. For example, AI tutors can adapt to each student's learning pace and style. This could help students who struggle with traditional teaching methods. Also, AI can grade assignments quickly, giving teachers more time to focus on actual teaching.",
        student2: "I'm concerned about the downsides. Students might become too dependent on AI and lose critical thinking skills. There's also the issue of academic integrity - students could use AI to cheat on assignments. Plus, not all schools have access to the latest AI technology, which could widen educational inequality.",
        question: "How do you think AI will change education in the next decade? What are the most important benefits and challenges we should consider?",
        professorName: "Professor Johnson",
        student1Name: "Sarah",
        student2Name: "Michael"
      },
      instructions: "ディスカッションの内容を読んで、AI技術が教育に与える影響についてあなたの意見を100語以上で述べてください。教授や他の学生の意見を参考にしながら、建設的な議論に参加してください。"
    },
    {
      id: "toefl-academic-discussion-sample-3",
      title: "TOEFL Academic Discussion: ソーシャルメディアの社会的影響",
      description: "ソーシャルメディアが社会に与える影響について、教授と学生のディスカッションを読んで自分の意見を述べる",
      type: "independent",
      taskType: "academic_discussion",
      difficulty: "初級",
      category: "Academic Discussion",
      timeLimit: 10,
      status: "not_started",
      createdAt: new Date(),
      wordCount: {
        min: 100,
        target: 150
      },
      discussionContent: {
        professor: "Social media has become an integral part of our daily lives, especially for young people. It has changed how we communicate, share information, and form relationships. Let's examine both the positive and negative effects of social media on society. Do you think social media has a more positive or negative impact on society overall? What specific changes would you suggest to make social media better for everyone? Please explain your reasoning with concrete examples.",
        student1: "Social media has many benefits. It helps people stay connected with friends and family, especially those who live far away. It also allows people to share their experiences and learn about different cultures. During the pandemic, social media was crucial for maintaining social connections.",
        student2: "However, social media also has serious problems. It can spread misinformation and fake news very quickly. Many people compare themselves to others on social media, which can lead to anxiety and depression. Also, cyberbullying is a major issue, especially among teenagers.",
        question: "Do you think social media has a more positive or negative impact on society overall? What specific changes would you suggest to make social media better for everyone?",
        professorName: "Dr. Williams",
        student1Name: "Emma",
        student2Name: "David"
      },
      instructions: "ディスカッションの内容を読んで、ソーシャルメディアの社会的影響についてあなたの意見を100語以上で述べてください。教授や他の学生の意見を参考にしながら、建設的な議論に参加してください。"
    },
    {
      id: "toefl-academic-discussion-sample-4",
      title: "TOEFL Academic Discussion: 気候変動への対策",
      description: "気候変動問題への対策について、教授と学生のディスカッションを読んで自分の意見を述べる",
      type: "independent",
      taskType: "academic_discussion",
      difficulty: "上級",
      category: "Academic Discussion",
      timeLimit: 10,
      status: "not_started",
      createdAt: new Date(),
      wordCount: {
        min: 100,
        target: 150
      },
      discussionContent: {
        professor: "Climate change is one of the most pressing challenges of our time. Governments, businesses, and individuals all have roles to play in addressing this issue. Let's discuss different approaches to climate action and their effectiveness. What do you think is the most effective approach to addressing climate change - individual actions, government policies, or corporate responsibility? Why do you believe this approach would be most successful? Please provide specific examples to support your argument.",
        student1: "I believe individual actions are crucial for fighting climate change. If everyone makes small changes like using public transportation, reducing meat consumption, and conserving energy, the collective impact would be significant. Personal responsibility drives larger systemic changes.",
        student2: "While individual actions are important, I think government policies and corporate responsibility are more effective. Individual efforts alone won't be enough to meet climate goals. We need strong regulations, carbon taxes, and corporate accountability to create real change on a large scale.",
        question: "What do you think is the most effective approach to addressing climate change - individual actions, government policies, or corporate responsibility? Why do you believe this approach would be most successful?",
        professorName: "Professor Chen",
        student1Name: "Lisa",
        student2Name: "James"
      },
      instructions: "ディスカッションの内容を読んで、気候変動への対策についてあなたの意見を100語以上で述べてください。教授や他の学生の意見を参考にしながら、建設的な議論に参加してください。"
    }
  ];
};

