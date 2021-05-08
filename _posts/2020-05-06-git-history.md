---
title: Git History - Novel or Ledger?
---
The varied approaches to repository history span the breadth from incoherent rambling trains of thought to orderly prose-like novels.  Typing in a commit message is a practice which introduces twinges of angst into a developer's day.  At the heart of this anxiety is a tension between the two roles Git serves, bookkeeper and mediator.  It's one of those things I always thought I had figured out but slowly I've come to see things in a whole new light.  A viewpoint I hope to share with this post.

# The Bookkeeper

<div class="row">
  <div class="col-md-9">
    <p>
While Git can serve many functions for different teams they can largely be divided into two categories.  First, Git is a developer's backup tool and personal notebook.  This concept is probably pretty familiar to you.  For myself it was where I started.  These types of commit messages illustrate Git's secretarial role
    </p>
    <ul>
      <li>
Commit early and often - You will be able to restore to different points in history in case you need to abandon your approach.  Also, if you push often then you will have backups in case your system crashes.
      </li>
      <li>
Picking up your trail - Most developers work on several features at once.  It gives you something to do while waiting on a code review, builds, or just to liven up the monotony.  It's easy to forget where you were when you come back to a branch.  One look at the ledger should refresh your memory.
      </li>
      <li>
Evidence of work - Comitting unfinished, rough code at the end of the day can often help share what you are working on.  Note, I'm not advocating for managers stalking their developers' commit histories.  It's simply that overcommunication and transparency smooth the gears of any team.
      </li>
    </ul>
  </div>
  <figure class="col-md-3 figure">
    <img alt="example git log of ledger" src="/blog/assets/images/2020-05-06/git-ledger.png" class="img-fluid figure-img rounded">
    <figcaption class="figure-caption text-center">A typical day in the life</figcaption>
  </figure>
</div>

# The Mediator

Git's book keeper role is useful even on a team of one as a personal backup and notepad.  Once a team starts to grow (or a repository is consumed by more people) it starts to serve another role, communicating changes amongst developers, users, and anyone else.  This is the role that gives us patterns such as [conventional (semantic) commits](https://www.conventionalcommits.org/en/v1.0.0/).

<figure class="figure mx-auto d-block">
  <img alt="example of semantic commit history" src="/blog/assets/images/2020-05-06/clean-commits.png" class="figure-img rounded mx-auto d-block">
  <figcaption class="figure-caption text-center">The Angular Material project keeps a very clean linear semantic commit history</figcaption>
</figure>

The advantages of such a history are equally straightforward:

 * Very easy to consume by users.  There is no "noise" in the history.
 * Can be easily used to create release notes.
 * If using semantic commits, the history can be further processed (e.g. to automatically report breaking changes).
 * Easy to bisect and blame, focuses on the "why" and not the "what".

# The Union

<div class="row">
  <div class="col-md-9">
    <p>
Now it should be clear where the impasse lies.  A "clean" history fails to serve as a record of a developer's work in progress.  Trying to fit to that model while developing would discourage healthy commit practices.  Meanwhile, the cluttered ledger of the book keeper is filled with too much noise to be useful as a communication tool.  The history in such a repository is simply ignored completely.
    </p>
    <p>
As it turns out, the solution is simple.  <bold>Use a ledger for development branches and a clean history for your releasing branches</bold>.  By "releasing branches" I mean those that you either build releases from or export out to other repositories.  For example, one of the most popular lightweight workflows is the stable trunk.  Every feature is done on a standalone branch (often on a fork of the main repository) and only put back on the trunk when the feature is finished.  Releases happen off of main and there is no back porting of fixes.
    </p>
    <p>
This of course leaves us with one simple question, "How can this be achieved?"
    </p>
  </div>
  <figure class="col-md-3 figure">
    <img alt="dirty branches merging to a clean tree" src="/blog/assets/images/2020-05-06/dirty-branch-clean-trunk.png" class="figure-img img-fluid rounded">
    <figcaption class="figure-caption text-center">Rough drafts go in the branches, final drafts in the trunk</figcaption>
  </figure>
</div>

# A case for rewriting history

<div class="row">
  <div class="col-md-9">
    <p>
Rewriting history is one of Git's most controversial yet powerful features.  However, the inescapable truth (that it took me ages to realize) is that this "ledger-work" simply does not belong.  Merging it into a releasable branch is the equivalent of turning in your rough drafts when you give a final copy of your paper to your professor.  Frankly, nobody cares about your stream of thought outside of yourself (and possibly an eager manager or teammate).
    </p>
    <p>
The technical details of how you eventually squash the work don't really matter.  Two popular approaches are squash rebasing and squash merging.  Squash rebase uses an interactive rebase (with squash) so that there is only a single commit on your feature branch (this has the added benefit of making it easier to rebase the trunk in rebase-only workflows). Squash merges use the "--squash" flag when you merge your work into the main trunk.  The second one tends to be safer and, if you're using something like Github, you can actually [enforce](https://docs.github.com/en/github/administering-a-repository/configuring-commit-squashing-for-pull-requests) all merges be squashed.
    </p>
    <p>
If you still aren't convinced and you are certain you need to keep all of these notes around in perpetuity (seriously, YAGNI) then there is a simple workaround.  You can keep the branches on your end.  Normally, developers will clean out their local branches after merging yet there is nothing that forces you to do this.  Admittedly, your local repository is going to fill up with noise but that is kind of the point.  If this seems distasteful to you then I would ask why it is any better to burden everyone else with your noise.
    </p>
    <div class="alert alert-warning" role="alert">
      <h5>Isn't it dangerous?</h5>
      <p>
It is valid to be concerned and cautious about rewriting history because of the potential to lose work (although you can almost always recover anything short of a hard reset by digging around in the ref log).  However, if done right, it does not have to be risky or complex.  Usually you can configure your repository to squash merge PRs.  This should be straightforward and foolproof.
      </p>
    </div>
  </div>
  <div class="col-md-3">
    <div class="card">
      <div class="card-header">
How did we get here?
      </div>
      <div class="card-body">
        <p>
If it is any comfort you should keep in mind that Git was not created to be a ledger.  It was created as a collaboration and communication tool.  Specifically it was created to ease massively parallel development on a code base.  Developers needed to be able to express and mediate their changes in a systematic and structured way.
        </p>
        <p>
The Linux kernel (for which Git was initially developed) still submits a majority of patches from individuals via email.  No patch even enters the ecosystem until all of the ledger work has been finished and thrown away.  The fact that we can use Git as our ledger is a bonus that shouldn't spill over and ruin the fundamental purpose, communication.
        </p>
      </div>
    </div>
  </div>
</div>

# Nested repositories and complex situations

<div class="row">
  <div class="col-md-9">
    <p>
More complex projects have multiple layers.  For example, a project might move from feature branches to release branches and then port those features from a release branch as back ports onto older releases.  Or a project might feed into another larger solution project.  Or you might even have something as complex as the git kernel, a large and rich graph of repositories.
    </p>
    <p>
In these situations we are again faced with merging a feature higher upstream.  So it is natural to ask if we should be deleting history again.  In almost all cases the answer is no.  Deleting history is for removing the noisy cruft that never <italic>really</italic> belonged in the repository in the first place.
    </p>
    <p>
In order to figure out what you should do you need to remember that the purpose of git history is to communicate to other developers.  Do the messages and diffs you are bringing along communicate useful information for the consumers?  If so, then it is best to keep it.  If not, then you can safely discard it.
    </p>
  </div>
  <figure class="col-md-3 figure">
    <img alt="a heirarchy of merges" src="/blog/assets/images/2020-05-06/heirarchy.png" class="figure-img img-fluid rounded">
    <figcaption class="figure-caption text-center">Once a commit is clean there is little to discard.  Merge commits can contain valuable information (e.g. telling us how a feature had to adapt to be back ported into an older release.)</figcaption>
  </figure>
</div> 

# Final thoughts

<hr>

 * Developer branches are noisy messy places.  This is a good thing and a best practice.
 * Releasable branches should be clean and mess free.  They need to communicate clearly to team members and users.
 * Rewriting history is necessary to remove the messy and useless train of thought information.  It can be done safely and it should not remove essential information.

<div class="card">
  <div class="card-header">
Postscript
  </div>
  <div class="card-body">
    <h5>A liability-driven case for history deletion</h5>
    <p>
I've hoped so far to convince you to follow my advice since it is the most effective strategy to follow.  However, if you are working on a project that takes community contributions, then there is an even simpler reason to squash merges.  When you review an incoming pull request it is unlikely that you are diving in and reviewing each and every commit in that request.  Most likely what you are doing is reviewing the final impact of the PR, what your merge tool is going to show you by default.
    </p>
    <p>
In reality, there could be anything hidden amongst those innocent ledger-looking messages.  A malicious troll could commit copyrighted material (or downright illegal material) and then simply revert the commit and layer a useful change on top of it.  Even a non-malicious but naive user could accidentally be pushing their security credentials, or a massive binary file, simply from a place of misunderstanding.  If you are not looking at the individual commits, and you are not squashing the merge, then you are not reviewing everything that is going into your repository.
    </p>
  </div>
</div>
