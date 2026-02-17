Chess engines do weird stuff that LLM people can learn from. Here are some:

**Training method**
Since AlphaZero, lc0-style chess engines have been trained with RL. Specifically, you have the engine (search + model) play itself a bunch of times, and train the model to predict the outcome of the game.
It turns out this isn't necessary. Good model vs bad model is ~200 elo, but [search is ~1200 elo](https://www.melonimarco.it/mm/wp-content/uploads/2021/03/stockfishnodes.png), so even a bad model + search is essentially an oracle to a good model without, and you can distill from bad model + search -> good model.
So RL was necessary in some sense only one time. Once a good model with search was trained, every future engine (including their competitors!) [footnote: Their primary competitor, Stockfish, [uses their data](https://github.com/official-stockfish/Stockfish#:~:text=Stockfish%20uses%20neural%20networks%20trained%20on%20data%20provided%20by%20the%20Leela%20Chess%20Zero%20project) and so do most engines. [Some engines don't](https://github.com/cosmobobak/viridithas#:~:text=The%20Viridithas%20project%20prides%20itself%20on%20using%20original%20training%20data%20for%20its%20neural%20networks.), mostly because they care about originality] can distill from that, and doesn't have to generate games (expensive). lc0 trained their premier model, BT4, with distillation and it got *worse* when you put it in the RL loop.
What makes distillation from search so powerful? People often compare this to distilling from best-of-n in RL, which I think is limited -- a chess engine that runs the model on 50 positions is roughly equivalent to a model 30x larger, whereas LLM best-of-50 is generously worth a model 2x larger. Perhaps this was why people wanted test-time search to work so badly when RLVR was right under their noses.

**Training at runtime**
[A recent technique](https://github.com/official-stockfish/Stockfish/pull/4950) is applying the distillation trick *at runtime*. At runtime, you evaluate early positions with your NN, then search them and get a more accurate picture. If your network says the position is +0.15 pawns better than search says, subtract 0.15 pawns from future evaluations. Your network live adapts to the position it's in!

**Training on winning**
The fundamental training objective of distilling from search is almost but not quite what we actually care about: winning. It's very correlated, but we don't actually care about how well the model estimates one position, we care about how well it performs *after search*, after looking at 100 positions.
To fix this, lc0 uses a weird technique called SPSA: you randomly perturb the weights in two directions, play a bunch of games, and go the direction that wins more[footnote: more specifically, they take a particular part of the weights, and then for every parameter you randomly choose +1 or -1, this is the direction tensor. you then create two versions of the network, one where `weight += direction` and one where `weight -= direction`. Then you play these two versions against each other. If positive wins, you do `weight += direction * lr`. If negative wins, `weight -= direction * lr`.]. This works very well and can get +50 elo on small models [footnote: up to about 15 elo on larger models].
Consider for a moment how insane it is that this works at all. You're modifying the weights in purely random directions. You have no gradient whatsoever. And yet it works quite well! +50 elo is ~1.5x model size or ~a year's worth of development effort!

The main issue with this is that it's wildly expensive. To do a single step you must play thousands of games with dozens of moves and hundreds of position inferences per move.

Like LLMs, you train for a long time on a pseudo-objective that's close to what you want, then a short time on a very expensive and limited objective that's closer to what you want.

**Tuning through C++**
The underlying technique of SPSA can be applied to *literally any number in your chess program*. Modify the number, see if it wins more or loses more, move in the direction that wins more. You have a hand-tuned heuristic that if there's a checkmate in the search from a position you should back off by [depth 1](https://github.com/official-stockfish/Stockfish/blob/54cf226604cfc9d17f432fa0b5bca56277e5561c/src/search.cpp#L1173)? [Replace that with thousandths-of-a-depth](https://github.com/official-stockfish/Stockfish/commit/cc5c67c564f52a0611ba38d04af02636291280b6) and then tune it with SPSA -- turns out the optimal value is actually to back off by depth [1.09](https://github.com/official-stockfish/Stockfish/commit/d9fd516547849bd5ca2a05c491aadc66fc750a39#diff-da923b7afa45cab7add143c4705b54142e46b2afe9a2627d5fa3b3474bdc8aecR108-R1192), which nets you 5 elo. You can do this *[for every number in your search algorithm](https://github.com/official-stockfish/Stockfish/commit/d9fd516547849bd5ca2a05c491aadc66fc750a39)*. You can do something that looks a lot like gradient descent *through arbitrary C++* because you have a grading function (winning).


**Weird architecture**
lc0 uses a standard-ish transformer architecture, which they found to be hundreds of elo better than their old convolution-based models. It's still confusing to me that the transformer biases apply to literally every application imaginable. The only substantial architectural change they use is "smolgen", a system for generating attention biases. They claim smolgen is a ~1.2x throughput hit but an accuracy win equivalent to *2.5x* model size. Why is it so good? I find all the explanations poor.

**Plug**
I am working on making a new chess engine. I think I have a real shot I could build the best one. Reach out to me if you have spare compute or funding.
