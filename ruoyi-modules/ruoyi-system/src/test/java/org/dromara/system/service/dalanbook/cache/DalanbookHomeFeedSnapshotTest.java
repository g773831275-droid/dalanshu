package org.dromara.system.service.dalanbook.cache;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.dromara.system.domain.dalanbook.v1.DalanPostV1;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("dev")
class DalanbookHomeFeedSnapshotTest {

    @Test
    void shouldRoundTripWithRedisObjectMapperShape() throws Exception {
        DalanPostV1 post = new DalanPostV1();
        post.setId("p_test");
        post.setAuthorId(1L);
        post.setCreatedAt(Instant.parse("2026-07-18T00:00:00Z"));
        ArrayList<DalanPostV1> posts = new ArrayList<>();
        posts.add(post);
        HashMap<Long, DalanbookHomeFeedSnapshot.FeedAuthor> authors = new HashMap<>();
        authors.put(1L, new DalanbookHomeFeedSnapshot.FeedAuthor(1L, "测试用户", 10L));
        DalanbookHomeFeedSnapshot snapshot = new DalanbookHomeFeedSnapshot(posts, new HashMap<>(), authors,
            new HashMap<>(), new HashMap<>(), true);

        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance, ObjectMapper.DefaultTyping.NON_FINAL);

        String json = mapper.writeValueAsString(snapshot);
        Object restored = mapper.readValue(json, Object.class);

        DalanbookHomeFeedSnapshot result = assertInstanceOf(DalanbookHomeFeedSnapshot.class, restored);
        assertEquals("p_test", result.getPosts().get(0).getId());
        assertEquals("测试用户", result.getAuthors().get(1L).getNickname());
        assertTrue(result.isHasMore());
    }
}
