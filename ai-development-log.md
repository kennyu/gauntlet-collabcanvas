## Tools and Workflow

I used Claude to create the PRD, architecture diagram of the mermaid, and tasklist. I used Cursor on the GPT5 model to iterate the project task by task with back and forth to validate each task was completed. 

## Prompting Strategies

1. Planning first workflow ( PRD to architecture diagram to tasklist ) and resolve specific design decisions in the planning stage. Have a prompt follow-up such as: Create a PRD based on the specifications in this document.
2. When debugging a UI task, it helps to ask cursor to console.log all the actions and feed the logs back into the context to troubleshoot an issue. Example prompt: Log all the mouse actions on the UI on console.log when the user interacts with the application. 
3. Prompt with specific ways in which you want to solve a problem and include the constraints, reasoning, and other relevant context that you believe the model would need. Example prompt: I want to use the realtime feature of supabase when syncing the canvas and shape states.
4. When stuck in an intractable feature issue, it helps to reset the git state and use a new agent chat.

## Code Analysis

About 99% of my code was written by AI. I stepped in with formatting issues and inputing the env variables. As a default practice, I pushed the cursor agent to try implementing features, bug fixing, and triaging before manually doing it myself.

## Strengths and Limitations

It is easy to lose track of the agentic codebase because the model likes to make changes in an ad-hoc fashion to fulfill the task requirements. It helps to have the full context of the project ( architecure, tasklist, and PRD ) and .cursorrules to ground the model to the requirements. The strengths is that the model can do a lot of tasks, at 10-100x the speed of a normal human. The limitations is that if the user is not actively monitoring the agent closely and have a clear mental model of the application data-flow, the agent can write code that would later be unintelligible to the user.

## Key Learnings 

Plan and prompt in detail so that the cursor model does not act with unspecified assumptions. The cursor model is great at doing what it thinks will fulfill the task requirements. Manage the context closely so relevant information stays in and irrelevant information will not derail the model trajectory. Always check on what the model is doing, including the libraries it is introducing and the specific approach to a solution so that you stay on top of the code context.