import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import s from "./prep.module.css";

export const metadata = {
  title: "Prep tips",
  description: "How to answer the interview questions everyone gets — TMAY, HR, technical, behavioural, project.",
};

const TOC = [
  { id: "tmay", label: "Tell me about yourself" },
  { id: "hr", label: "HR round" },
  { id: "logistics", label: "Pay & logistics" },
  { id: "technical", label: "Technical" },
  { id: "fundamentals", label: "CS fundamentals" },
  { id: "coding", label: "Coding round" },
  { id: "behavioral", label: "Behavioral · STAR" },
  { id: "failure", label: "Failure & conflict" },
  { id: "project", label: "Project" },
  { id: "questions", label: "Questions to ask" },
  { id: "nerves", label: "Calm the nerves" },
];

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className={s.step}>
      <span className={s.n}>{n}</span>
      <span className={s.t}>{children}</span>
    </div>
  );
}

export default function PrepPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Prep tips"
        title="How to answer the questions everyone gets"
        subtitle="Short, honest guides for the questions that trip people up — mapped to your interview sections. A structure you can actually use, plus a real example. Read one before your next mock."
      />
      <div className={s.toc}>
        {TOC.map((t) => (
          <a key={t.id} href={`#${t.id}`}>{t.label}</a>
        ))}
      </div>

      {/* TMAY */}
      <section className={s.guide} id="tmay">
        <div className={s.q}><span className={s.ic}>👋</span><h3>“Tell me about yourself”</h3><span className={s.sec}>Every interview</span></div>
        <p className={s.why}>The opener, every time. Keep it ~60–90 seconds — it sets the tone, not your life story.</p>
        <div className={s.steps}>
          <Step n={1}><b>Present</b> — <em>what you do now (course, recent role, or focus).</em></Step>
          <Step n={2}><b>Past</b> — <em>one or two things that led here — a project, internship, or skill.</em></Step>
          <Step n={3}><b>Future</b> — <em>why this role is the natural next step for you.</em></Step>
        </div>
        <div className={s.example}>
          <div className={s.lab}>Example · fresher</div>
          <i>“I&apos;m a final-year CS student who fell for frontend work while building a food-delivery clone
          in React — I loved turning designs into something people could click. Since then I&apos;ve shipped
          three side projects and a college-fest site used by 2,000 students. I&apos;m after a frontend role
          where I can keep learning from a strong team, which is exactly why this one caught my eye.”</i>
        </div>
        <div className={s.dd}>
          <div className={`${s.dcard} ${s.do}`}><div className={s.h}>✓ Do</div><ul><li>Keep it tight and relevant</li><li>End on why you&apos;re here</li><li>Sound like a person, not a resume</li></ul></div>
          <div className={`${s.dcard} ${s.dont}`}><div className={s.h}>✕ Avoid</div><ul><li>Your whole life story</li><li>Reading your CV out loud</li><li>“Hardworking &amp; passionate” with no proof</li></ul></div>
        </div>
      </section>

      {/* HR */}
      <section className={s.guide} id="hr">
        <div className={s.q}><span className={s.ic}>💼</span><h3>The HR round</h3><span className={s.sec}>HR</span></div>
        <p className={s.why}>Testing motivation and fit — do you actually want <i>this</i> job, and will you stick around? Be genuine; canned answers are obvious.</p>
        <div className={s.qlist}>
          <div className={s.qi}><b>“Why do you want to work here?”</b><span>Tie your goal to something specific about them — a product, their tech, how they work. Not “good company, good culture.”</span></div>
          <div className={s.qi}><b>“Where do you see yourself in 5 years?”</b><span>Show ambition that fits <i>this</i> path — a stronger version of this role, not a different career.</span></div>
          <div className={s.qi}><b>“Why should we hire you?”</b><span>Match 2–3 of their needs to your strengths, briefly. Confidence, not arrogance.</span></div>
          <div className={s.qi}><b>“What&apos;s your biggest weakness?”</b><span>Name a real, fixable gap + what you&apos;re doing about it. Never “I&apos;m a perfectionist.”</span></div>
        </div>
        <div className={s.example}>
          <div className={s.lab}>Example · weakness</div>
          <i>“I used to jump into coding before fully planning. On my last project it caused a rewrite, so
          now I sketch the data flow first — it&apos;s already saved me time on the two projects since.”</i>
        </div>
      </section>

      {/* Pay & logistics */}
      <section className={s.guide} id="logistics">
        <div className={s.q}><span className={s.ic}>🧾</span><h3>Pay &amp; logistics</h3><span className={s.sec}>HR</span></div>
        <p className={s.why}>The practical questions — pay, notice, location, shifts. Answer calmly; they&apos;re normal, not traps.</p>
        <div className={s.qlist}>
          <div className={s.qi}><b>“What&apos;s your expected salary?”</b><span>As a fresher: “I&apos;d like to be aligned with the market standard for this role — I&apos;m open to discussing.” Don&apos;t demand a number or lowball yourself.</span></div>
          <div className={s.qi}><b>“Are you okay to relocate / work in shifts?”</b><span>If yes, say it clearly — flexibility genuinely helps freshers get picked. If unsure, be honest but stay positive.</span></div>
          <div className={s.qi}><b>“What&apos;s your notice period / when can you join?”</b><span>Freshers: “I can join immediately” (or your real date). Simple and confident.</span></div>
          <div className={s.qi}><b>“Are you interviewing elsewhere?”</b><span>Be honest but low-key — “I have a couple of processes going” is enough. Don&apos;t oversell or beg.</span></div>
        </div>
      </section>

      {/* Technical */}
      <section className={s.guide} id="technical">
        <div className={s.q}><span className={s.ic}>⚙️</span><h3>Answering technical questions</h3><span className={s.sec}>Technical</span></div>
        <p className={s.why}>They care <i>how you think</i> as much as the final answer. Make your reasoning visible.</p>
        <div className={s.steps}>
          <Step n={1}><b>Restate</b> the question — <em>confirm you understood it.</em></Step>
          <Step n={2}><b>Think aloud</b> — <em>say your assumptions and options out loud.</em></Step>
          <Step n={3}><b>Weigh trade-offs</b> — <em>“I&apos;d pick X over Y because…”. This is what separates good answers.</em></Step>
          <Step n={4}><b>Give an example</b> — <em>a tiny concrete case beats an abstract definition.</em></Step>
        </div>
      </section>

      {/* CS fundamentals */}
      <section className={s.guide} id="fundamentals">
        <div className={s.q}><span className={s.ic}>📖</span><h3>CS fundamentals to revise</h3><span className={s.sec}>Technical</span></div>
        <p className={s.why}>Most fresher technical rounds test the <i>basics</i>, deeply — not fancy stuff. Revise these cold.</p>
        <div className={s.qlist}>
          <div className={s.qi}><b>OOP</b><span>Encapsulation, inheritance, polymorphism, abstraction — with a real example of each.</span></div>
          <div className={s.qi}><b>DBMS &amp; SQL</b><span>Joins, normalization, indexes, keys — and be ready to write a query on the spot.</span></div>
          <div className={s.qi}><b>Operating Systems</b><span>Process vs thread, deadlock, scheduling, memory basics.</span></div>
          <div className={s.qi}><b>DSA</b><span>Arrays, strings, hashing, recursion, sorting — the bread and butter.</span></div>
          <div className={s.qi}><b>Networks</b><span>OSI layers, TCP vs UDP, and “what happens when you type a URL and hit enter.”</span></div>
          <div className={s.qi}><b>Everything on your resume</b><span>If you wrote “React,” expect hooks &amp; rendering questions. They go deep on <i>your</i> claims — know them cold.</span></div>
        </div>
      </section>

      {/* Coding round */}
      <section className={s.guide} id="coding">
        <div className={s.q}><span className={s.ic}>💻</span><h3>The coding round</h3><span className={s.sec}>Technical</span></div>
        <p className={s.why}>They watch <i>how you approach it</i>, not just the final code. Narrate as you go.</p>
        <div className={s.steps}>
          <Step n={1}><b>Clarify</b> — <em>restate the problem, ask about inputs and edge cases.</em></Step>
          <Step n={2}><b>Example</b> — <em>walk one small case through by hand.</em></Step>
          <Step n={3}><b>Brute force first</b> — <em>a working solution beats a stuck “optimal” one.</em></Step>
          <Step n={4}><b>Optimise</b> — <em>then improve time/space and explain the trade-off.</em></Step>
          <Step n={5}><b>Test</b> — <em>dry-run edge cases: empty, one item, duplicates.</em></Step>
          <Step n={6}><b>State complexity</b> — <em>time &amp; space, at the end.</em></Step>
        </div>
        <div className={s.example}>
          <div className={s.lab}>Stuck?</div>
          Say it out loud: “Let me think — I could try X or Y.” Reasoning aloud scores far more than silence.
          <b> Never bluff a wrong answer confidently</b> — “I&apos;m not sure, but here&apos;s how I&apos;d find out” is a strong answer.
        </div>
      </section>

      {/* Behavioral / STAR */}
      <section className={s.guide} id="behavioral">
        <div className={s.q}><span className={s.ic}>💬</span><h3>Behavioral — the STAR method</h3><span className={s.sec}>Behavioral</span></div>
        <p className={s.why}>For any “tell me about a time when…” — teamwork, conflict, a failure, taking initiative. Structure keeps you from rambling.</p>
        <div className={s.starrow}>
          <div className={s.starc}><span className={s.l}>S</span><b>Situation</b><span>Set the scene in a sentence.</span></div>
          <div className={s.starc}><span className={s.l}>T</span><b>Task</b><span>What was your goal or problem?</span></div>
          <div className={s.starc}><span className={s.l}>A</span><b>Action</b><span>What <i>you</i> did — the biggest part.</span></div>
          <div className={s.starc}><span className={s.l}>R</span><b>Result</b><span>How it turned out — a number if you can.</span></div>
        </div>
        <div className={s.example}>
          <div className={s.lab}>Example · teamwork</div>
          <i>“Our group project was stalling because two of us disagreed on the framework <b>(S/T)</b>. I set
          up a quick call, listed the trade-offs on a shared doc, and we voted <b>(A)</b> — we shipped on
          time and reused that habit on the next project <b>(R)</b>.”</i>
        </div>
        <div className={s.example}>
          <div className={s.lab}>Tip</div>
          Spend most of your time on <b>Action</b> and <b>Result</b> — interviewers assume there was a
          situation; they want what <i>you</i> did and what changed.
        </div>
      </section>

      {/* Failure & conflict */}
      <section className={s.guide} id="failure">
        <div className={s.q}><span className={s.ic}>🔧</span><h3>“A time you failed / disagreed”</h3><span className={s.sec}>Behavioral</span></div>
        <p className={s.why}>They want honesty + growth, not a humblebrag. “I work too hard” is a non-answer.</p>
        <div className={s.steps}>
          <Step n={1}><b>Pick a real, small one</b> — <em>genuine, not catastrophic, not fake.</em></Step>
          <Step n={2}><b>Own your part</b> — <em>don&apos;t blame teammates or circumstances.</em></Step>
          <Step n={3}><b>What you changed</b> — <em>the lesson is the whole point of the question.</em></Step>
        </div>
        <div className={s.example}>
          <div className={s.lab}>Example</div>
          <i>“In a group project I under-tested my module and it broke during the demo. I owned it, fixed it
          that night, and now I write test cases before I call something done.”</i>
        </div>
      </section>

      {/* Project */}
      <section className={s.guide} id="project">
        <div className={s.q}><span className={s.ic}>📂</span><h3>Talking about your project</h3><span className={s.sec}>Project</span></div>
        <p className={s.why}>This is where freshers win or lose — you&apos;re judged on your <i>own</i> work, and they&apos;ll drill into what <i>you</i> did.</p>
        <div className={s.steps}>
          <Step n={1}><b>What it does</b> — <em>one clear line on the problem it solves.</em></Step>
          <Step n={2}><b>Your role</b> — <em>the parts you personally built, not the team&apos;s.</em></Step>
          <Step n={3}><b>A challenge</b> — <em>one real problem you hit and how you solved it.</em></Step>
          <Step n={4}><b>What you&apos;d change</b> — <em>shows you reflect and keep learning.</em></Step>
        </div>
        <div className={s.example}>
          <div className={s.lab}>Watch out</div>
          Be ready to separate <b>“I built X”</b> from <b>“we built X.”</b> In a group project they&apos;ll
          push to find your actual contribution — know your lines of the code.
        </div>
      </section>

      {/* Questions to ask them */}
      <section className={s.guide} id="questions">
        <div className={s.q}><span className={s.ic}>🙋</span><h3>“Do you have any questions for us?”</h3><span className={s.sec}>Closing</span></div>
        <p className={s.why}>Saying “no” looks disinterested. Always have 2–3 ready — it&apos;s your chance to seem keen and thoughtful.</p>
        <div className={s.qlist}>
          <div className={s.qi}><b>Good to ask</b><span>“What does a typical first three months look like for someone in this role?”</span></div>
          <div className={s.qi}><b>Good to ask</b><span>“What skills would help me contribute the fastest here?”</span></div>
          <div className={s.qi}><b>Good to ask</b><span>“How does the team learn and grow together?”</span></div>
        </div>
        <div className={s.example}>
          <div className={s.lab}>Avoid (for now)</div>
          Don&apos;t lead with salary, leaves, or work-from-home — save those for when there&apos;s an offer on the table.
        </div>
      </section>

      {/* Nerves */}
      <section className={s.guide} id="nerves">
        <div className={s.q}><span className={s.ic}>🌱</span><h3>Calming the nerves</h3><span className={s.sec}>Every interview</span></div>
        <p className={s.why}>A little nervous is normal — even good. Here&apos;s how to keep it working <i>for</i> you.</p>
        <div className={s.steps}>
          <Step n={1}><b>It&apos;s a conversation</b>, <em>not an interrogation — they want you to do well.</em></Step>
          <Step n={2}><b>A pause is fine</b> — <em>“let me think for a second” beats rushing.</em></Step>
          <Step n={3}><b>You practised this</b> — <em>every mock you took makes this one feel smaller.</em></Step>
        </div>
      </section>
    </AppShell>
  );
}
