import { posts, circleRec } from "@/data/mockPosts";
import { PostCard } from "./PostCard";
import { CircleRecCard } from "./CircleRecCard";

export function MasonryFeed() {
  return (
    <div className="columns-2 gap-2.5 md:columns-3 md:gap-4 xl:columns-4 2xl:columns-5">
      {posts.map((post, i) => (
        <div key={post.id} className="contents">
          <PostCard post={post} />
          {i === 6 && (
            <CircleRecCard
              name={circleRec.name}
              desc={circleRec.desc}
              members={circleRec.members}
            />
          )}
        </div>
      ))}
    </div>
  );
}
