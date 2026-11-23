// Question bank: 3 course topics × 5 questions (4 options each).
// `answer` is the index of the correct option. `review` is the short
// concept card Üki shows when the coach recommends "Review".

export const TOPICS = [
  {
    id: 'python',
    title: 'Python basics',
    week: 'Assignment topic',
    blurb: 'Lists, references, integer division, slicing and truthiness.',
    questions: [
      {
        q: 'What does print(len([1, [2, 3], 4])) show?',
        options: ['4', '3', '2', 'An error'],
        answer: 1,
        explain: 'The list has three elements: 1, the inner list [2, 3] and 4. len does not look inside the inner list.',
        review: 'len counts the top-level items of a list. A nested list counts as one item, however long it is.',
      },
      {
        q: 'x = [1, 2, 3]; y = x; y.append(4). What is x now?',
        options: ['[1, 2, 3]', '[4, 1, 2, 3]', '[1, 2, 3, 4]', 'An error'],
        answer: 2,
        explain: 'y = x does not copy the list. Both names point to the same list, so appending through y changes x too.',
        review: 'Assignment binds a second name to the same object. Use x.copy() or list(x) when you need a separate list.',
      },
      {
        q: 'What does print(7 // 2, 7 % 2) show?',
        options: ['3.5 1', '3 1', '4 1', '3 0'],
        answer: 1,
        explain: '// is floor division, 7 // 2 = 3. % is the remainder, 7 = 2 × 3 + 1, so 7 % 2 = 1.',
        review: 'a // b gives the whole number of times b fits into a; a % b gives what is left over. / always gives a float.',
      },
      {
        q: 'What is "python"[1:4]?',
        options: ['"pyt"', '"ytho"', '"yth"', '"pyth"'],
        answer: 2,
        explain: 'Indexes start at 0 and the end of a slice is excluded: positions 1, 2 and 3 are y, t, h.',
        review: 's[a:b] takes the characters from index a up to, but not including, index b. "python"[0] is "p".',
      },
      {
        q: 'What does print(bool([]), bool([0])) show?',
        options: ['False False', 'True False', 'False True', 'True True'],
        answer: 2,
        explain: 'An empty list is falsy. [0] is a list with one item, so it is truthy even though that item is 0.',
        review: 'Empty containers ("", [], {}) and 0 are falsy; any non-empty container is truthy, whatever it holds.',
      },
    ],
  },
  {
    id: 'search',
    title: 'Search and A*',
    week: 'Week 2',
    blurb: 'Frontiers, uniform-cost search, heuristics and A*.',
    questions: [
      {
        q: 'Which data structure does breadth-first search use for its frontier?',
        options: ['A stack (last in, first out)', 'A queue (first in, first out)', 'A priority queue ordered by h(n)', 'A hash set of visited states'],
        answer: 1,
        explain: 'BFS expands the shallowest node first, so new nodes join the back of a FIFO queue.',
        review: 'BFS = FIFO queue, DFS = LIFO stack, UCS and A* = priority queue. The data structure decides the order in which nodes are expanded.',
      },
      {
        q: 'A* always expands the frontier node with the smallest…',
        options: ['g(n), the cost so far', 'h(n), the estimated cost to the goal', 'depth in the search tree', 'g(n) + h(n)'],
        answer: 3,
        explain: 'A* uses f(n) = g(n) + h(n): what the path has cost so far plus an estimate of what is left.',
        review: 'UCS orders by g(n), greedy best-first by h(n), A* by f(n) = g(n) + h(n). Combining both keeps A* optimal and focused.',
      },
      {
        q: 'A heuristic h(n) is admissible when it…',
        options: ['never overestimates the true remaining cost', 'always equals the true remaining cost', 'never underestimates the true remaining cost', 'is the same for every node'],
        answer: 0,
        explain: 'Admissible means 0 ≤ h(n) ≤ h*(n). An optimistic estimate keeps A* tree search optimal.',
        review: 'Admissible: never overestimate. Manhattan distance on a 4-direction grid with unit costs is admissible because no route can be shorter.',
      },
      {
        q: 'Edges: A→B costs 2, B→F costs 10, A→C costs 8, C→F costs 1. Which path cost does uniform-cost search return from A to F?',
        options: ['12', '2', '9', '11'],
        answer: 2,
        explain: 'A–C–F costs 8 + 1 = 9, cheaper than A–B–F = 2 + 10 = 12. UCS compares total cost, not the number of steps.',
        review: 'BFS sees two 2-step routes and cannot tell them apart; UCS adds edge costs and picks the cheaper one, 9.',
      },
      {
        q: 'If h(n) = 0 for every node, A* behaves like…',
        options: ['depth-first search', 'greedy best-first search', 'hill climbing', 'uniform-cost search'],
        answer: 3,
        explain: 'With h = 0, f(n) = g(n), which is exactly the UCS priority.',
        review: 'h = 0 is admissible but gives no guidance, so A* explores like UCS. A better admissible heuristic means fewer expanded nodes.',
      },
    ],
  },
  {
    id: 'bayes',
    title: 'Probability and Bayes',
    week: 'Week 6',
    blurb: 'Conditional probability, Bayes’ rule and Bayesian networks.',
    questions: [
      {
        q: 'A disease affects 1% of people. A test detects it 95% of the time and gives false positives 10% of the time. A patient tests positive. What is P(disease | positive), roughly?',
        options: ['95%', '8.8%', '10%', '50%'],
        answer: 1,
        explain: '0.95 × 0.01 = 0.0095 true positives versus 0.10 × 0.99 = 0.099 false positives: 0.0095 / 0.1085 ≈ 8.8%.',
        review: 'Posterior = likelihood × prior / evidence. Rare conditions produce many false alarms, so the base rate matters as much as the test accuracy.',
      },
      {
        q: 'In Bayes’ rule, the prior is…',
        options: ['your belief before seeing the evidence', 'the probability of the evidence given the hypothesis', 'your belief after seeing the evidence', 'the probability that the sensor works'],
        answer: 0,
        explain: 'The prior P(H) is the starting belief; the evidence turns it into the posterior P(H | E).',
        review: 'Prior: before. Likelihood P(E | H): how expected the evidence is if H is true. Posterior P(H | E): after.',
      },
      {
        q: 'A Bayesian network is…',
        options: ['an undirected graph of correlations', 'a directed acyclic graph with a probability table at each node', 'a decision tree trained on data', 'a neural network with probabilistic outputs'],
        answer: 1,
        explain: 'Nodes are random variables, arrows are direct dependencies, and each node stores P(node | parents).',
        review: 'Joint probability = product of P(Xᵢ | parents). Small local tables replace one table with 2ⁿ rows.',
      },
      {
        q: 'Out of 100 days, 30 were rainy and 24 of those had heavy traffic. What is P(heavy traffic | rain)?',
        options: ['24%', '45%', '80%', '30%'],
        answer: 2,
        explain: 'Conditioning on rain keeps only the 30 rainy days: 24 / 30 = 80%.',
        review: 'A condition changes the denominator. P(A | B) counts A only among the cases where B happened.',
      },
      {
        q: 'Rejection sampling becomes inefficient when…',
        options: ['the evidence is rare', 'the network is small', 'all priors are 0.5', 'the variables are binary'],
        answer: 0,
        explain: 'Samples that do not match the evidence are thrown away; rare evidence means almost every sample is wasted.',
        review: 'Rejection sampling discards mismatching samples. Likelihood weighting fixes the evidence and weights each sample instead.',
      },
    ],
  },
  {
    id: 'mdp',
    title: 'MDPs and reinforcement learning',
    week: 'Week 5',
    blurb: 'Rewards, discounting, Bellman updates and Q-learning.',
    questions: [
      {
        q: 'A Markov decision process is defined by…',
        options: ['states, actions, transition probabilities, rewards and a discount factor', 'a start state and a goal test only', 'a frontier and a heuristic', 'labelled training examples'],
        answer: 0,
        explain: 'MDP = (S, A, P, R, γ). The solution is a policy: an action for every state.',
        review: 'Search returns a path; an MDP returns a policy, because the same action can lead to different next states.',
      },
      {
        q: 'What does the discount factor γ control?',
        options: ['How much future rewards count compared with immediate ones', 'How big each learning update is', 'How often the agent explores at random', 'How many states the model has'],
        answer: 0,
        explain: 'γ near 0 cares only about now; γ near 1 values distant rewards almost as much as immediate ones.',
        review: 'γ weights the future, α is the learning rate, ε is the exploration rate. Three different jobs.',
      },
      {
        q: 'Rewards 5, then 10, then 20 with γ = 0.9. What is the discounted return?',
        options: ['35', '24.2', '30.2', '28.1'],
        answer: 2,
        explain: '5 + 0.9 × 10 + 0.81 × 20 = 5 + 9 + 16.2 = 30.2.',
        review: 'Return G = r₁ + γr₂ + γ²r₃ + …  Each step further away is multiplied by one more γ.',
      },
      {
        q: 'Q-learning update with Q = 4, reward 2, best next Q = 8, γ = 0.9 and α = 0.5. What is the new Q?',
        options: ['9.2', '5.2', '4.6', '6.6'],
        answer: 3,
        explain: 'Target 2 + 0.9 × 8 = 9.2; error 9.2 − 4 = 5.2; new Q = 4 + 0.5 × 5.2 = 6.6.',
        review: 'Q ← Q + α [r + γ max Q(s′, a′) − Q]. The bracket is the TD error; α decides how far to move toward the target.',
      },
      {
        q: 'Compared with SARSA, Q-learning is…',
        options: ['off-policy: its target uses the best next action', 'on-policy: its target uses the action actually taken', 'model-based: it needs the transition table', 'supervised: it needs labelled actions'],
        answer: 0,
        explain: 'Q-learning targets r + γ max Q(s′, ·), regardless of which action the agent explores next.',
        review: 'SARSA learns from the action it really takes next, so it learns more cautious behaviour near danger.',
      },
    ],
  },
];

// Preset answer patterns for the live demo and for tests (true = correct).
export const DEMO_PATTERNS = [
  { id: 'improving', label: 'Starts weak, then improves', answers: [false, false, true, true, true] },
  { id: 'strong', label: 'Strong from the start', answers: [true, true, true, true, true] },
  { id: 'struggling', label: 'Keeps struggling', answers: [false, true, false, false, false] },
];
