What margins do the AI companies have on inference?

The answer to this question dictates everything. If it's 0%, the companies are going to be ground in the dust and are scrabbling for some piece of the future. If it's 80%, in a few years these companies will be generating comparable free cash flow to Google.

The answer here is strongly non-obvious. It is quite difficult to reconcile all the different pieces of information available. But here is my best attempt, using both public and private information.

-----

To start off with, as a base case, I believe the margins of open source inference providers on e.g. openrouter are <10% and often <0%. I think this is confirmed by the general discourse of the people involved and also by a-priori calculations of what their margins should be.

But what we care about are the margins of the large AI companies, especially OpenAI and Anthropic.

Main sources of information:
1. The model providers have publicly stated things about training cost.
2. We can guess or derive the number of tokens they trained on, some of this is discussed in lawsuits
These things combined allow us to get at the number of parameters they have, which strongly correlates with inference cost.
3. We know roughly the cost to the providers of compute and the characteristics of their compute.
If we know the amount of inference work required to inference a model, and the dollar cost of compute to do that inference work, we can derive the cost in dollars of inferencing a model.
4. There have been leaks of company financials that help us with overall costs, though these can be distorted by confusing accounting.
<!-- maybe you want to distort the accounting for capex/opex purposes -->

The major free variable is fleetwide MFU or general efficiency.
<!-- Another major question is people using techniques we don't know about, which is always possible. -->

Let's apply all of this to Claude 3.5 Sonnet.
It cost ["a few $10M's to train"](https://www.darioamodei.com/post/on-deepseek-and-export-controls#:~:text=Claude%203.5%20Sonnet%20is%20a%20mid%2Dsized%20model%20that%20cost%20a%20few%20%2410M%27s%20to%20train). Let's call it $30M. A reasonable number for H100 cost (most of their compute at that time) was about $2/hr.  A reasonable number for achieved flops/H100 is ~400T, or 40% MFU <!-- note: doesn't matter whether bf16 or fp8 -->. This means they did around 2*10^25 flops. A reasonable number for token count is about 30 trillion. So we can guess then Claude 3.5 sonnet is about 120B activated parameters. It's probably using MoE, so the number of full parameters is probably greater (trillions?).

If we assume it looks 
