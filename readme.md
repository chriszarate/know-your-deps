# Know Your Dependencies!

This is a silly command-line NPM module that picks a random dependency from
your project and gives you some info about it.

You probably have a lot of dependencies that you've never heard of and you have
absolutely no idea what they do. Is that a good thing? Probably not.
[That's the whole point of this.][blog-post]

```sh
cd my-hot-shit-js-project
npx know-your-deps
```

It looks for a `package-lock.json` in the folder you run it in.

## But I use Yarn.

Well, aren't you fancy. Make a PR, Mr. Big Britches.

[blog-post]: https://chris.zarate.org/know-your-dependencies
