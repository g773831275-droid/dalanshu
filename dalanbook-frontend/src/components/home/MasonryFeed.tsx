import { useQuery } from "@tanstack/react-query";
import { posts as initialPosts, circleRec } from "@/data/mockPosts";
import { getFeed } from "@/lib/dalanbookApi";
import { PostCard } from "./PostCard";
import { CircleRecCard } from "./CircleRecCard";

export function MasonryFeed() {
  const { data: posts = initialPosts } = useQuery({
    queryKey: ["dalanbook", "feed"],
    queryFn: getFeed,
    placeholderData: initialPosts,
    staleTime: 30_000,
  });

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
