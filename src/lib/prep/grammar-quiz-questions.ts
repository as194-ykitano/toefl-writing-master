export interface GrammarQuizQuestion {
  sentence: string;
  choices: string[];
  answer: number;
  explanation: string;
  category: string;
}

type QuestionSource = readonly [
  sentence: string,
  correctAnswer: string,
  distractors: readonly [string, string, string],
  explanation: string,
  category: string,
];

// English Gym Admin の「例文暗記 Advanced」(advanced1) をもとに作成。
// 正解位置は問題番号ごとにずらし、「常に先頭が正解」にならないようにする。
const ADVANCED_QUESTION_SOURCES: readonly QuestionSource[] = [
  ["I've visited ___ museums in the city.", "a number of", ["an amount of", "much", "the number"], "a number of は『いくつもの』という意味で、可算名詞の複数形を続けます。", "数量表現"],
  ["You can choose from various colors, sizes, ___ .", "and so on", ["as a result", "in advance", "at once"], "and so on は、例を列挙したあとに『など』と続ける表現です。", "定型表現"],
  ["We have ___ time to catch the train.", "plenty of", ["many", "a few", "a number of"], "plenty of は可算・不可算名詞のどちらにも使え、ここでは不可算名詞 time を修飾します。", "数量表現"],
  ["Many children are afraid ___ the dark.", "of", ["from", "with", "at"], "be afraid of ... で『…を怖がる』という決まった形です。", "前置詞"],
  ["Flowers were blooming all ___ the park.", "over", ["from", "beside", "between"], "all over ... は『…の至る所で』という意味です。", "前置詞"],
  ["Our new house is close ___ the park.", "to", ["with", "from", "at"], "be close to ... で『…に近い』を表します。", "前置詞"],
  ["This plan is far ___ perfect.", "from", ["to", "of", "with"], "far from ... は『…から程遠い／…どころではない』という表現です。", "前置詞"],
  ["She spent a great deal of time ___ for the exam.", "studying", ["study", "to study", "studied"], "spend time doing の形で『…することに時間を費やす』を表します。", "動名詞"],
  ["Are you aware ___ the risks involved?", "of", ["about", "from", "with"], "be aware of ... で『…を認識している』という意味です。", "前置詞"],
  ["First ___ all, let's review the basic rules.", "of", ["at", "for", "in"], "first of all は『まず第一に』という定型表現です。", "定型表現"],
  ["There were dozens ___ people at the concert.", "of", ["for", "from", "with"], "dozens of ... で『数十もの…』を表します。", "数量表現"],
  ["She is responsible ___ overseeing the project.", "for", ["to", "of", "with"], "be responsible for doing で『…する責任がある』という形です。", "前置詞"],
  ["So far, we ___ $5,000 for the charity.", "have raised", ["raised", "raise", "are raising"], "so far は『これまでのところ』なので、現在完了形が自然です。", "時制"],
  ["He is willing ___ with the event.", "to help", ["helping", "help", "helped"], "be willing to do で『進んで…する』を表します。", "不定詞"],
  ["It is likely ___ tomorrow.", "to rain", ["raining", "rain", "rained"], "be likely to do で『…しそうだ』という意味です。", "不定詞"],
  ["This design is different ___ the previous one.", "from", ["than", "to", "with"], "be different from ... が標準的な『…と異なる』の形です。", "前置詞"],
  ["I have a couple ___ questions about your proposal.", "of", ["for", "with", "from"], "a couple of ... は『2、3の…』という数量表現です。", "数量表現"],
  ["The term “AI” refers ___ artificial intelligence.", "to", ["for", "at", "with"], "refer to ... で『…を指す』という意味です。", "前置詞"],
  ["She is capable ___ solving complex problems.", "of", ["to", "for", "with"], "be capable of doing で『…する能力がある』を表します。", "動名詞"],
  ["He suffers ___ severe allergies during spring.", "from", ["of", "with", "by"], "suffer from ... で『…に苦しむ』という意味です。", "前置詞"],
  ["Volunteering contributes ___ community well-being.", "to", ["for", "with", "in"], "contribute to ... で『…に貢献する』を表します。", "前置詞"],
  ["It's important to know how ___ stress.", "to deal with", ["dealing with", "deal to", "to deal to"], "how to do は『どのように…するか』、deal with は『対処する』です。", "疑問詞＋不定詞"],
  ["We need to focus ___ improving our customer service.", "on", ["to", "at", "for"], "focus on doing で『…することに集中する』という形です。", "動名詞"],
  ["This chair is made ___ wood.", "of", ["from", "by", "with"], "材料の原形が見て分かる場合は be made of を使います。", "前置詞"],
  ["The accident resulted ___ heavy traffic delays.", "in", ["from", "to", "with"], "result in ... は『結果として…を引き起こす』という意味です。", "前置詞"],
  ["He is about ___ his presentation.", "to start", ["starting", "start", "started"], "be about to do で『今にも…しようとしている』を表します。", "不定詞"],
  ["Poor communication can lead ___ misunderstandings.", "to", ["for", "with", "at"], "lead to ... で『…につながる／…を引き起こす』という意味です。", "前置詞"],
  ["Success in this project depends ___ everyone's effort.", "on", ["of", "from", "at"], "depend on ... で『…に依存する』を表します。", "前置詞"],
  ["The theory is based ___ scientific evidence.", "on", ["in", "at", "from"], "be based on ... で『…に基づいている』という形です。", "前置詞"],
  ["Please fill ___ this application form.", "out", ["up", "over", "off"], "fill out a form は『用紙に記入する』という句動詞です。", "句動詞"],
  ["She grew ___ in a loving family.", "up", ["out", "over", "on"], "grow up は『成長する』という句動詞です。", "句動詞"],
  ["When you live abroad, you get ___ new people.", "to meet", ["meeting", "meet", "met"], "get to do で『…する機会を得る／…できる』を表します。", "不定詞"],
  ["Many people rely ___ public transportation.", "on", ["to", "at", "for"], "rely on ... で『…に頼る』という意味です。", "前置詞"],
  ["He is satisfied ___ the results of his work.", "with", ["to", "from", "at"], "be satisfied with ... で『…に満足している』を表します。", "前置詞"],
  ["She participates ___ many volunteer activities.", "in", ["on", "at", "for"], "participate in ... で『…に参加する』という意味です。", "前置詞"],
  ["This recipe calls ___ fresh herbs.", "for", ["to", "on", "with"], "call for ... は『…を必要とする』という句動詞です。", "句動詞"],
  ["Can you look ___ the pets while I'm away?", "after", ["for", "into", "over"], "look after ... は『…の世話をする』という意味です。", "句動詞"],
  ["I've never heard ___ that movie.", "of", ["from", "at", "with"], "hear of ... は『…の存在について聞く』という表現です。", "前置詞"],
  ["She gets ___ well with her colleagues.", "along", ["over", "away", "through"], "get along with ... で『…と仲良くやる』を表します。", "句動詞"],
  ["This approach differs ___ the traditional method.", "from", ["to", "with", "of"], "differ from ... で『…と異なる』という意味です。", "前置詞"],
  ["Our team consists ___ five engineers.", "of", ["from", "with", "in"], "consist of ... で『…から構成される』を表します。", "前置詞"],
  ["The experiment turned out ___ a success.", "to be", ["being", "be", "been"], "turn out to be ... で『…であることが分かる』という形です。", "不定詞"],
  ["I haven't heard ___ him in a while.", "from", ["of", "to", "with"], "hear from ... は『…から連絡をもらう』という意味です。", "前置詞"],
  ["You need to concentrate ___ your studies.", "on", ["to", "for", "at"], "concentrate on ... で『…に集中する』を表します。", "前置詞"],
  ["She often complains ___ the weather.", "about", ["for", "to", "with"], "complain about ... で『…について不平を言う』という意味です。", "前置詞"],
  ["He succeeded ___ breaking the world record.", "in", ["at", "to", "for"], "succeed in doing で『…することに成功する』を表します。", "動名詞"],
  ["Many people believe ___ the power of education.", "in", ["on", "at", "to"], "believe in ... は『…の価値・存在を信じる』という表現です。", "前置詞"],
  ["The flood resulted ___ heavy rains.", "from", ["in", "to", "with"], "result from ... は『…が原因で生じる』です。result in との向きの違いに注意します。", "前置詞"],
  ["We went ___ a lot of challenges this year.", "through", ["over", "after", "against"], "go through ... は『困難などを経験する』という句動詞です。", "句動詞"],
  ["This policy could bring ___ significant changes.", "about", ["up", "over", "out"], "bring about ... は『…を引き起こす』という句動詞です。", "句動詞"],
  ["They decided ___ after five years together.", "to break up", ["breaking up", "break up", "broke up"], "decide to do の形を取り、break up は『別れる』を意味します。", "不定詞"],
  ["The airplane took ___ on time.", "off", ["out", "up", "over"], "take off は飛行機が『離陸する』という句動詞です。", "句動詞"],
  ["The manager asked us ___ with our work.", "to carry on", ["carrying on", "carry on", "carried on"], "ask 人 to do の形で、carry on は『続ける』を表します。", "不定詞"],
  ["He pointed ___ the mistake in the report.", "out", ["at", "up", "over"], "point out ... は『…を指摘する』という句動詞です。", "句動詞"],
  ["They set ___ a new company in Tokyo.", "up", ["out", "off", "over"], "set up a company は『会社を設立する』という意味です。", "句動詞"],
  ["The team carried ___ the plan successfully.", "out", ["on", "over", "up"], "carry out a plan は『計画を実行する』という句動詞です。", "句動詞"],
  ["She brought ___ two children on her own.", "up", ["out", "over", "off"], "bring up children は『子どもを育てる』という意味です。", "句動詞"],
  ["He gave ___ smoking last year.", "up", ["out", "away", "over"], "give up doing で『…することをやめる』を表します。", "句動詞"],
  ["Can I try ___ this dress?", "on", ["out", "up", "over"], "try on clothes は『服を試着する』という表現です。", "句動詞"],
  ["She figured ___ the solution to the problem.", "out", ["up", "over", "off"], "figure out ... は『…を理解する／解決する』という句動詞です。", "句動詞"],
  ["We need to cut down ___ our expenses.", "on", ["to", "for", "at"], "cut down on ... で『…を減らす』という意味です。", "句動詞"],
  ["He accidentally left his phone ___ at the cafe.", "behind", ["away", "back", "off"], "leave ... behind は『…を置き忘れる』という表現です。", "句動詞"],
  ["The car broke ___ on the way to the beach.", "down", ["up", "out", "off"], "break down は車や機械が『故障する』という句動詞です。", "句動詞"],
  ["The success of the project was due in part ___ teamwork.", "to", ["for", "of", "with"], "be due to ... は『…が原因である』という表現です。", "前置詞"],
  ["Respond to the email ___ once.", "at", ["in", "on", "for"], "at once は『すぐに』という定型表現です。", "定型表現"],
  ["The speakers will present their ideas ___ turn.", "in", ["at", "by", "on"], "in turn は『順番に』という表現です。", "定型表現"],
  ["In fact, he ___ Europe before.", "had never visited", ["has never visited", "never visits", "was never visiting"], "過去の時点より前の経験なので、過去完了形 had visited を使います。", "時制"],
  ["Let's rest ___ a while.", "for", ["during", "since", "by"], "for a while で『しばらくの間』を表します。", "前置詞"],
  ["Considering the situation as ___ whole, it's a success.", "a", ["the", "one", "this"], "as a whole は『全体として』という定型表現です。", "冠詞"],
  ["The doors were about to close, but she arrived just ___ time for the meeting.", "in", ["on", "at", "by"], "just in time は『ぎりぎり間に合って』という意味です。on time は『予定時刻どおりに』を表します。", "前置詞"],
  ["Try to be as quiet as ___ during the lecture.", "possible", ["possibly", "possibility", "more possible"], "as ... as possible で『できる限り…』を表します。", "比較表現"],
  ["He arrived late, ___ usual.", "as", ["like", "for", "with"], "as usual は『いつものように』という定型表現です。", "定型表現"],
  ["You should pay attention ___ the warnings.", "to", ["for", "at", "on"], "pay attention to ... で『…に注意を払う』を表します。", "前置詞"],
  ["The festival takes ___ every summer.", "place", ["part", "time", "turn"], "take place は『開催される／起こる』という定型表現です。", "定型表現"],
  ["Please take care ___ my dog while I'm away.", "of", ["for", "to", "with"], "take care of ... で『…の世話をする』という意味です。", "前置詞"],
  ["I can handle only one task ___ a time.", "at", ["in", "on", "for"], "at a time は『一度に』という定型表現です。", "定型表現"],
  ["We need ___ two more people to start the project.", "at least", ["at most", "at last", "in least"], "at least は『少なくとも』という意味です。", "数量表現"],
  ["Make sure the door is locked before you ___ .", "leave", ["will leave", "left", "would leave"], "時を表す before 節では、未来のことでも現在形を使います。", "時制"],
  ["We can accommodate ___ 50 guests in this room.", "at most", ["at least", "at last", "in most"], "at most は『多くても』という上限を表します。", "数量表現"],
  ["She ___ works here.", "no longer", ["not longer", "no more longer", "any longer"], "no longer は肯定文の形で『もはや…ない』を表します。", "否定表現"],
  ["She sees me ___ a close friend.", "as", ["like", "for", "to"], "see A as B で『AをBとみなす』を表します。", "語法"],
  ["We need to come up ___ a solution quickly.", "with", ["to", "for", "on"], "come up with ... は『…を思いつく』という句動詞です。", "句動詞"],
  ["She spends a lot of money ___ books.", "on", ["for", "to", "at"], "spend money on ... で『…にお金を使う』を表します。", "前置詞"],
  ["He turned his hobby ___ a successful business.", "into", ["in", "to", "for"], "turn A into B で『AをBに変える』という意味です。", "前置詞"],
  ["His strict parents prevent him ___ out late.", "from going", ["to go", "go", "of going"], "prevent 人 from doing で『人が…するのを妨げる』を表します。", "動名詞"],
  ["I used ___ the piano when I was younger.", "to play", ["playing", "play", "to playing"], "used to do は『以前はよく…した』という過去の習慣を表します。", "助動詞表現"],
  ["We really enjoyed ___ at the party.", "ourselves", ["us", "our", "we"], "enjoy oneself で『楽しく過ごす』という意味になります。", "再帰代名詞"],
  ["The company provides employees ___ health insurance.", "with", ["to", "for", "of"], "provide A with B で『AにBを提供する』を表します。", "語法"],
  ["I studied at home instead ___ going to the library.", "of", ["to", "for", "from"], "instead of doing で『…する代わりに』という意味です。", "動名詞"],
  ["He was chosen for the team, regardless ___ his young age.", "of", ["to", "for", "from"], "regardless of ... で『…にかかわらず』を表します。", "前置詞"],
  ["Many people associate cherry blossoms ___ Japan.", "with", ["to", "for", "of"], "associate A with B で『AをBと結びつける』という意味です。", "語法"],
  ["In addition ___ his skills, he brings a positive attitude.", "to", ["of", "for", "with"], "in addition to ... は『…に加えて』という表現です。", "前置詞"],
  ["She succeeded in spite ___ all the obstacles.", "of", ["to", "for", "from"], "in spite of ... で『…にもかかわらず』を表します。", "前置詞"],
  ["She is talented not only in art ___ also in music.", "but", ["and", "or", "so"], "not only A but also B で『AだけでなくBも』という相関表現です。", "接続表現"],
  ["The game was cancelled because ___ the rain.", "of", ["for", "from", "with"], "because of の後ろには名詞句が続きます。because の後ろは節です。", "接続表現"],
  ["Keep your phone handy in case we ___ to contact you.", "need", ["will need", "needed", "would need"], "in case 節では、未来の可能性でも通常は現在形を使います。", "時制"],
  ["He acts as if he ___ everything.", "knows", ["know", "is know", "knowing"], "主語が三人称単数 he なので、現在形の動詞には -s が必要です。", "主語と動詞の一致"],
  ["She devotes her time ___ helping the homeless.", "to", ["for", "at", "on"], "devote A to doing で『Aを…することにささげる』を表します。", "動名詞"],
  ["Please look ___ the documents before signing them.", "over", ["after", "for", "into"], "look over ... は『…にざっと目を通す』という句動詞です。", "句動詞"],
  ["The government is looking ___ the cause of the accident.", "into", ["after", "for", "over"], "look into ... は『…を調査する』という句動詞です。", "句動詞"],
];

function buildQuestion(source: QuestionSource, index: number): GrammarQuizQuestion {
  const [sentence, correctAnswer, distractors, explanation, category] = source;
  const answer = index % 4;
  const choices = [...distractors];
  choices.splice(answer, 0, correctAnswer);
  return { sentence, choices, answer, explanation, category };
}

export const GRAMMAR_QUIZ_QUESTIONS: readonly GrammarQuizQuestion[] =
  ADVANCED_QUESTION_SOURCES.map(buildQuestion);
