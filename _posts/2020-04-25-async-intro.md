---
title: Intro to asynchronous iteration
---
In this series of posts I will review work I did recently which combined iteration with asynchronous development.
Combining the two allows us to manually schedule both RAM as well as CPU to process large files in a streaming
fashion while utilizing both pipeline as well as fan-out parallelism.  The end result is something similar to
reactive programming but pull based instead of push based.

# Introduction

This article will assume you are familiar with some basic asynchronous programming concepts.
Callbacks/delegates and promises/futures/tasks are used throughout these posts.  If you are new to asynchronous
programming I recommend checking out a short [video](https://youtu.be/_7UZi-BVgfg) I made recently explaining
the benefits.  In addition, you will probably want to be familiar with what an iterator is and how they can be
used to reduce the memory pressure of an application.  Finally, I'll be using C# for code blocks as C# has a
good combination of builtin async support and conciseness.  I'll avoid some of the newer features (e.g. 
async/await, span, etc.) to keep things universal.

Before we define asynchronous iteration let us start with some motivation and a concrete example.  I recently did
some work for the Apache Arrow project which is the basis of these posts.  I worked on the dataset scanner which
scans a collection of files in an iterative fashion to allow incremental analytics to run on datasets larger than
the available RAM in the system.  The first thing the scanner needs to do is start reading data from files.

File I/O is a simple operation that is often handled asynchronously.  File I/O will be the motivation behind most
of these posts as it was the motivation behind my work on Arrow.  When reading data from a disk we make an OS call
and that call might block.  To handle this, most modern languages give us asynchronous methods for reading files.
There are a number of technologies (e.g. epoll & libuv, io_uring, IOCP) that might be behind these methods but the
specifics don't matter.

With that out of the way we can go ahead and concretely define what an asynchronous iterator is.  I'll add a
definition for a synchronous iterator as well so you can see the contrast:

~~~ csharp
interface Iterator<T>
{
    T Next();
}

interface AsyncIterator<T>
{
    Task<T> Next();
}
~~~

There remains the minor matter of determining when we have reached the end of iteration but for simplicity we
will define the end marker as `null`.

# Our First AsyncIterator

Now we can take a pass at defining a simple asynchronous iterator for reading a file:

~~~ csharp
public class Buffer
{
    public byte[] Data { get; init; }
    public int Length { get; init; }
}

public class AsyncFileIterator : AsyncIterator<Buffer>
{
    public Task<Buffer> Next();
}
~~~

The details of the implementation are omitted for brevity.  What is important to understand is that the
file read is broken into two stages.

 1. A synchronous **provisioning** step that calculates the offset into the file to read (since we are streaming
    a file this offset will grow by some block size each call).
 2. An asynchronous **execution** step that actually performs the read.

Although we are currently talking about files this pattern of synchronous **provisioning** and asynchronous
**execution** is present in nearly every asynchronous generator.  We will revisit these concepts when we
start to look at parallel execution.

# Iteration

The first (and most basic) goal is iterating through each item in the iterator until we reach the end.
Let's consider a simple `Visit` operation:

~~~ csharp
public static Task Visit(AsyncIterator<T> iterator, Action<T> visitor)
~~~

Again we will skip the details but the flow of execution is roughly:

~~~
Do:
  Provision next task from the asynchronous iterator
  Wait for the task to complete
  Run visitor on result
While result != null
~~~

Assuming you have `async/await` keywords this method is actually pretty easy to implement.  Without them it turns into
a tricky set of recursive continuations.  The important things to note here is that **each task must be completed before
we provision the next task.**  When we start to talk about parallel execution this rule will get relaxed and more nuance
will be introduced.  With this rule in place there is no need for any synchronization (beyond that which is likely contained
in the `Task` (i.e. `promise/future`) implementation.)

# So what?

Given that we are waiting for each item to complete before processing the next it may be prudent to ask if we have changed anything
at all from the synchronous version.  As it turns out, we have.  In the synchronous version the thread that calls `Visit` will be
blocked for the duration of the call.  In the asynchronous version a task is scheduled each time a block of I/O completes and the calling
thread returns immediately.  The exact details of what happens when a task is scheduled depends on the tools you are using
(perhaps I will write about that in the future) but to illustrate this here are two instances of a basic file visit in C#, visualized
with the Visual Studio Concurrency Visualizer:

[![sync](/blog/assets/images/sync-file-iter.png)]

In the above syncrhonous version the main thread is doing all the work (green).

[![async](/blog/assets/images/async-file-iter.png)]

In the above asynchronous version the work (green) is spread out across a number of worker threads while the main thread is mostly idle.

There is no significant performance difference between the two approaches because there is no actual parallelism going on.
However, by freeing up the calling thread, we can reduce the total number of threads that we need (this reduction is not well illustrated
in the above diagrams due to the simplicity of the task but for more details see the video linked in the introduction).

# What's next?

In the next post I will go over readahead and introduce a new concept I've coined "asynchronous reentrancy."  I will show how readahead
makes it easy to introduce parallelism in asynchronous iterators.

# Try it out

Implementing a basic `AsyncFileIterator` and `Visit` function should only take a moment in C# (assuming familiarity with TPL) or Javascript.
Give it a shot and prove to yourself it works.