const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

exports.getAIResponse = async (message, gradeLevel, studentName, conversationHistory = []) => {

  if (!exports.environmentChecked) {
    checkEnvironment();
    exports.environmentChecked = true;
  }

  const Models = [
    "openrouter/polaris-alpha",
    "microsoft/phi-3-medium-4k-instruct:free", 
    "meta-llama/llama-3.1-8b-instruct:free",
    "qwen/qwen-2.5-1.5b:free",
    "huggingfaceh4/zephyr-orpo-141b-a35b:free"
  ];

  const systemPrompt = `You are Professor Aria - the coolest, most engaging AI tutor for ${studentName} (Grade: ${gradeLevel}).

## YOUR SUPERPOWERS:
**Real-Life Connector**: Every concept must connect to daily life, hobbies, games, movies, social media
**Funny & Relatable**: Use age-appropriate humor, memes references, pop culture analogies
**Storyteller**: Teach through mini-stories, scenarios, and adventures
**Mind-Blowing Analogies**: Compare complex ideas to TikTok trends, video games, sports
**Friend First**: Talk like their favorite cool teacher who "gets it"

## ENGAGEMENT FORMULA:
1. **Hook**: Start with surprising real-life connection or funny analogy
2. **Relate**: Connect to their world (games, sports, friends, school life)
3. **Simplify**: Break it down like explaining to a friend
4. **Wow Factor**: Share a cool fact or "did you know?" moment
5. **Action**: End with something they can try or notice in real life

## STRICT FORMATTING RULES:
NO dashes, underscores, bullets, numbers, markdown
NO unusual emojis in middle of sentences
NO robotic academic language
ONLY natural flowing paragraphs
Use 1-2 relevant emojis MAX at the end
Clean, smooth sentences without special characters

## CONVERSATION MAGIC:
- If math → Compare to video game levels, sports scores, pizza slices
- If science → Connect to superhero powers, nature documentaries, cooking
- If history → Make it like time travel adventure stories
- If literature → Relate to movie plots, song lyrics, social media drama
- Always include a light joke or funny observation
- Reference their previous questions naturally

## EXAMPLE STYLE:
Instead of "Photosynthesis has two stages: light-dependent and light-independent"
Say: "Okay, imagine plants are like tiny solar-powered chefs! They take sunlight as their cooking energy, mix it with water and air, and voila - they whip up their own food! It's like nature's version of a cooking show, but way more scientific and way less drama than your favorite reality TV! "

NOW make ${studentName} fall in love with learning!`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: message }
  ];

 

  if (!OPENROUTER_API_KEY) {
    return {
      answer: getEngagingFallback(message, studentName, gradeLevel),
      success: true,
      modelUsed: 'fallback-no-api-key'
    };
  }

  for (let i = 0; i < Models.length; i++) {
    const currentModel = Models[i];
    
    try {
      
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions', 
        {
          model: currentModel,
          messages: messages,
          max_tokens: 800, 
          temperature: 0.8,
          top_p: 0.9,
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.APP_URL || 'https://schoolapp.com',
            'X-Title': 'School AI Tutor'
          },
          timeout: 15000 
        }
      );

      let answer = response.data.choices[0].message.content;

      answer = cleanAIResponse(answer);
      
      return {
        answer: answer,
        success: true,
        modelUsed: currentModel
      };

    } catch (error) {
      if (i === Models.length - 1) {
        return {
          answer: getEngagingFallback(message, studentName, gradeLevel),
          success: true,
          modelUsed: 'fallback'
        };
      }
      
  
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
};

function cleanAIResponse(answer) {
  return answer
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s?/g, '')
    .replace(/\-\s/g, '')
    .replace(/\d\.\s/g, '')
    .replace(/`{1,3}/g, '')
    .replace(/\\/g, '')
    .replace(/\_\s/g, ' ')
    .replace(/\_/g, '')
    .replace(/\-\-/g, '')
    .replace(/\s\-\s/g, ' ')
    .replace(/(\d+\)\s)/g, '')
    .replace(/([•·◦])\s/g, '')
    .replace(/\s+/g, ' ')
    .replace(/([^ ])([\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}])/gu, '$1')
    .trim();
}

function getEngagingFallback(question, studentName, gradeLevel) {
  const questionLower = question.toLowerCase();

  const engagingResponses = {
    math: `Hey ${studentName}! Your math question is like discovering a secret level in your favorite game - it seems tricky at first but becomes super satisfying once you crack it! Normally I'd break it down with examples from pizza slices to video game scores. Let me reboot my brain and we'll tackle this together in a moment! 🎮➗`,

    science: `Whoa ${studentName}, that's an awesome science question! It reminds me of those moments in superhero movies where they explain the cool science behind powers. I'd usually dive into experiments and real-world magic, but my lab coat is at the cleaners right now! Let me fix this quickly and we'll explore together! 🔬✨`,

    english: `${studentName}, your English question is like finding the perfect plot twist in a great story! I'd normally unpack this with references from trending shows and songs that make grammar actually cool. My dictionary is doing updates, but I'll be back in a flash to make words come alive! 📚🎭`,

    history: `Time travel alert! ${studentName}, your history question is like uncovering ancient secrets. I'd usually take us on an adventure through time with stories that connect to our world today. My time machine needs a quick charge, but we'll be exploring past wonders together soon! ⏳🏰`,

    general: `Hey ${studentName}! That question is fire! 🔥 As a ${gradeLevel} student, you're asking the kind of questions that lead to epic discoveries. I'd normally break it down with stories, jokes, and real-life connections that make learning feel like an adventure. My brain is doing a quick system update - back in a moment to continue our learning journey! 🚀🌟`
  };

  if (questionLower.includes('math') || questionLower.includes('calculate') || questionLower.includes('algebra') || questionLower.includes('equation')) {
    return engagingResponses.math;
  } else if (questionLower.includes('science') || questionLower.includes('physics') || questionLower.includes('chemistry') || questionLower.includes('biology') || questionLower.includes('experiment')) {
    return engagingResponses.science;
  } else if (questionLower.includes('english') || questionLower.includes('grammar') || questionLower.includes('literature') || questionLower.includes('write') || questionLower.includes('story')) {
    return engagingResponses.english;
  } else if (questionLower.includes('history') || questionLower.includes('past') || questionLower.includes('ancient') || questionLower.includes('war') || questionLower.includes('king')) {
    return engagingResponses.history;
  } else {
    return engagingResponses.general;
  }
}


exports.environmentChecked = false;