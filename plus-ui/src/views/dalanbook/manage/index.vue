<template>
  <div class="p-2">
    <el-card shadow="hover" class="mb-[10px]">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item :label="pageMeta.keywordLabel">
          <el-input v-model="queryParams.keyword" clearable :placeholder="`请输入${pageMeta.keywordLabel}`" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">{{ pageMeta.title }}</span>
          <div class="flex items-center gap-2">
            <el-button v-if="contentType === 'circles'" v-hasPermi="['dalanbook:circle:add']" type="primary" icon="Plus" @click="openCircleDialog()">
              新增圈子
            </el-button>
            <el-button icon="Refresh" circle @click="loadList" />
          </div>
        </div>
      </template>

      <el-table v-loading="loading" border :data="rows">
        <el-table-column label="ID" prop="id" min-width="150" show-overflow-tooltip />

        <template v-if="contentType === 'posts'">
          <el-table-column label="封面" width="106" align="center">
            <template #default="scope">
              <el-image
                v-if="scope.row.cover"
                :src="scope.row.cover"
                :preview-src-list="[scope.row.cover]"
                preview-teleported
                fit="cover"
                class="h-[54px] w-[72px] rounded"
              >
                <template #error>
                  <div class="flex h-full items-center justify-center bg-gray-100 text-xs text-gray-400">加载失败</div>
                </template>
              </el-image>
              <span v-else class="text-xs text-gray-400">无封面</span>
            </template>
          </el-table-column>
          <el-table-column label="标题" prop="title" min-width="220" show-overflow-tooltip />
          <el-table-column label="作者" min-width="150" show-overflow-tooltip>
            <template #default="scope">
              <div>{{ scope.row.authorName }}</div>
              <div class="text-xs text-gray-400">ID：{{ scope.row.authorId }}</div>
            </template>
          </el-table-column>
          <el-table-column label="圈子" min-width="160" show-overflow-tooltip>
            <template #default="scope">
              <div>{{ scope.row.circleName }}</div>
              <div class="text-xs text-gray-400">{{ scope.row.circleId }}</div>
            </template>
          </el-table-column>
          <el-table-column label="话题" min-width="180">
            <template #default="scope">
              <div v-if="scope.row.topics?.length" class="flex flex-wrap gap-1">
                <el-tag v-for="topic in scope.row.topics" :key="topic" size="small">#{{ topic }}</el-tag>
              </div>
              <span v-else class="text-gray-400">—</span>
            </template>
          </el-table-column>
          <el-table-column label="评论" prop="commentCount" width="72" align="center" />
          <el-table-column label="点赞" prop="likeCount" width="72" align="center" />
          <el-table-column label="收藏" prop="favoriteCount" width="72" align="center" />
          <el-table-column label="有用" prop="usefulCount" width="72" align="center" />
          <el-table-column label="可见范围" width="96" align="center">
            <template #default="scope">{{ visibilityLabel(scope.row.visibility) }}</template>
          </el-table-column>
        </template>

        <template v-else-if="contentType === 'circles'">
          <el-table-column label="封面" width="78" align="center">
            <template #default="scope">
              <el-image :src="scope.row.coverUrl || scope.row.cover" fit="cover" class="h-10 w-10 rounded" />
            </template>
          </el-table-column>
          <el-table-column label="圈子名称" prop="name" min-width="180" show-overflow-tooltip />
          <el-table-column label="分类" prop="category" width="120" />
          <el-table-column label="圈主ID" prop="ownerId" width="100" />
          <el-table-column label="标签" min-width="160">
            <template #default="scope">
              <el-tag v-for="tag in parseTags(scope.row.tags)" :key="tag" class="mr-1" size="small">{{ tag }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="成员" prop="memberCount" width="90" />
          <el-table-column label="帖子" prop="postCount" width="90" />
          <el-table-column label="首页展示" width="90" align="center">
            <template #default="scope">
              <el-tag :type="scope.row.homeVisible ? 'success' : 'info'">{{ scope.row.homeVisible ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="推荐权重" prop="recommendWeight" width="100" />
          <el-table-column label="排序" prop="sortOrder" width="80" />
        </template>

        <template v-else>
          <el-table-column label="话题名称" prop="name" min-width="180" />
          <el-table-column label="Slug" prop="slug" min-width="180" show-overflow-tooltip />
          <el-table-column label="说明" prop="description" min-width="240" show-overflow-tooltip />
          <el-table-column label="帖子" prop="postCount" width="90" />
        </template>

        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="statusTagType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createdAt" width="170">
          <template #default="scope">{{ proxy?.parseTime(scope.row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" :width="contentType === 'circles' ? 310 : 190" align="center">
          <template #default="scope">
            <el-button v-if="contentType === 'topics'" link type="primary" icon="Edit" @click="openTopicDialog(scope.row)">编辑</el-button>
            <template v-else-if="contentType === 'circles'">
              <el-button v-hasPermi="['dalanbook:circle:list']" link type="primary" icon="Memo" @click="openPinnedDialog(scope.row)">
                置顶消息
              </el-button>
              <el-button v-hasPermi="['dalanbook:circle:edit']" link type="primary" icon="Edit" @click="openCircleDialog(scope.row)">
                维护
              </el-button>
              <el-dropdown v-hasPermi="['dalanbook:circle:edit']" trigger="click" @command="(status) => changeStatus(scope.row, status)">
                <el-button link type="primary"
                  >状态<el-icon class="el-icon--right"><ArrowDown /></el-icon
                ></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="option in statusOptions"
                      :key="option.value"
                      :command="option.value"
                      :disabled="scope.row.status === option.value"
                    >
                      {{ option.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button
                v-if="scope.row.status !== 'deleted'"
                v-hasPermi="['dalanbook:circle:remove']"
                link
                type="danger"
                icon="Delete"
                @click="removeCircle(scope.row)"
              >
                删除
              </el-button>
            </template>
            <el-dropdown v-else trigger="click" @command="(status) => changeStatus(scope.row, status)">
              <el-button link type="primary"
                >审核状态<el-icon class="el-icon--right"><ArrowDown /></el-icon
              ></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="option in statusOptions"
                    :key="option.value"
                    :command="option.value"
                    :disabled="scope.row.status === option.value"
                  >
                    {{ option.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="loadList" />
    </el-card>

    <el-dialog v-model="circleDialog.visible" :title="circleForm.id ? '维护圈子' : '新增圈子'" width="720px" append-to-body>
      <el-form :model="circleForm" label-width="96px">
        <div class="grid grid-cols-1 gap-x-5 md:grid-cols-2">
          <el-form-item label="圈子名称" required>
            <el-input v-model="circleForm.name" maxlength="80" show-word-limit />
          </el-form-item>
          <el-form-item label="分类" required>
            <el-select v-model="circleForm.category" filterable allow-create class="w-full" placeholder="请选择或输入分类">
              <el-option v-for="category in circleCategories" :key="category" :label="category" :value="category" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="圈子封面">
          <div>
            <el-upload
              class="circle-cover-upload"
              :action="uploadUrl"
              :headers="uploadHeaders"
              :show-file-list="false"
              accept=".png,.jpg,.jpeg,.webp"
              :before-upload="beforeCoverUpload"
              :on-success="coverUploadSuccess"
              :on-error="coverUploadError"
            >
              <div
                v-loading="coverUploading"
                class="group relative flex h-32 w-52 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50"
              >
                <el-image v-if="coverPreview" :src="coverPreview" fit="cover" class="h-full w-full" />
                <div v-else class="flex flex-col items-center gap-2 text-gray-400">
                  <el-icon :size="28"><Plus /></el-icon>
                  <span>上传圈子封面</span>
                </div>
                <div
                  v-if="coverPreview"
                  class="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  重新上传
                </div>
              </div>
            </el-upload>
            <div class="mt-2 text-xs text-gray-400">支持 JPG、PNG、WebP，大小不超过 5MB；再次点击图片即可替换。</div>
          </div>
        </el-form-item>
        <el-form-item label="圈子简介" required>
          <el-input v-model="circleForm.description" type="textarea" :rows="3" maxlength="300" show-word-limit />
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="circleForm.tags"
            multiple
            filterable
            allow-create
            default-first-option
            class="w-full"
            :multiple-limit="5"
            placeholder="输入后回车，最多 5 个"
          >
            <el-option v-for="tag in circleTags" :key="tag" :label="tag" :value="tag" />
          </el-select>
        </el-form-item>
        <el-form-item label="圈主" required>
          <el-select
            v-model="circleForm.ownerId"
            filterable
            remote
            :remote-method="loadUserOptions"
            :loading="usersLoading"
            class="w-full"
            placeholder="搜索用户名或昵称"
          >
            <el-option v-for="user in userOptions" :key="user.userId" :label="userOptionLabel(user)" :value="user.userId" />
          </el-select>
        </el-form-item>
        <el-form-item label="圈子管理员">
          <el-select
            v-model="circleForm.adminIds"
            multiple
            filterable
            remote
            :remote-method="loadUserOptions"
            :loading="usersLoading"
            class="w-full"
            :multiple-limit="10"
            placeholder="最多配置 10 人"
          >
            <el-option v-for="user in userOptions" :key="user.userId" :label="userOptionLabel(user)" :value="user.userId" />
          </el-select>
        </el-form-item>
        <div class="grid grid-cols-1 gap-x-5 md:grid-cols-3">
          <el-form-item label="推荐权重">
            <el-input-number v-model="circleForm.recommendWeight" :min="0" :max="9999" />
          </el-form-item>
          <el-form-item label="展示排序">
            <el-input-number v-model="circleForm.sortOrder" :min="0" :max="9999" />
          </el-form-item>
          <el-form-item label="首页展示">
            <el-switch v-model="circleForm.homeVisible" />
          </el-form-item>
        </div>
        <el-form-item label="圈子状态">
          <el-radio-group v-model="circleForm.status">
            <el-radio v-for="option in circleStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="circleDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="circleDialog.saving" :disabled="coverUploading" @click="saveCircle">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="pinnedDialog.visible" :title="`${pinnedDialog.circleName} · 置顶消息`" width="1080px" append-to-body destroy-on-close>
      <div class="mb-4 flex items-center justify-between">
        <span class="text-sm text-gray-500">可维护多条图文内容；排序值越小，用户端展示越靠前。</span>
        <el-button v-hasPermi="['dalanbook:circle:edit']" type="primary" icon="Plus" @click="openPinnedItemDialog()">新增置顶消息</el-button>
      </div>
      <el-table v-loading="pinnedDialog.loading" :data="pinnedItems" border max-height="520">
        <el-table-column label="排序" prop="sortOrder" width="72" align="center" />
        <el-table-column label="类型" width="96" align="center">
          <template #default="scope"
            ><el-tag>{{ pinnedKindLabel(scope.row.kind) }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="配图" width="92" align="center">
          <template #default="scope">
            <el-image
              v-if="scope.row.images?.length"
              :src="scope.row.images[0].url"
              :preview-src-list="scope.row.images.map((image) => image.url)"
              preview-teleported
              fit="cover"
              class="h-12 w-12 rounded"
            />
            <span v-else class="text-gray-400">无</span>
          </template>
        </el-table-column>
        <el-table-column label="标题" prop="title" min-width="190" show-overflow-tooltip />
        <el-table-column label="正文" prop="content" min-width="230" show-overflow-tooltip />
        <el-table-column label="发布状态" width="96" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.publishStatus === 'published' ? 'success' : 'info'">
              {{ scope.row.publishStatus === 'published' ? '已发布' : '已隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="168">
          <template #default="scope">{{ proxy?.parseTime(scope.row.publishedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right" align="center">
          <template #default="scope">
            <el-button v-hasPermi="['dalanbook:circle:edit']" link type="primary" icon="Edit" @click="openPinnedItemDialog(scope.row)">
              编辑
            </el-button>
            <el-button v-hasPermi="['dalanbook:circle:edit']" link type="danger" icon="Delete" @click="removePinnedItem(scope.row)"> 删除 </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!pinnedDialog.loading && pinnedItems.length === 0" description="该圈子还没有置顶消息" />
    </el-dialog>

    <el-dialog
      v-model="pinnedItemDialog.visible"
      :title="pinnedForm.id ? '编辑置顶消息' : '新增置顶消息'"
      width="760px"
      append-to-body
      destroy-on-close
    >
      <el-form :model="pinnedForm" label-width="92px">
        <div class="grid grid-cols-1 gap-x-5 md:grid-cols-2">
          <el-form-item label="消息类型" required>
            <el-select v-model="pinnedForm.kind" class="w-full">
              <el-option v-for="option in pinnedKindOptions" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="展示排序" required>
            <el-input-number v-model="pinnedForm.sortOrder" :min="0" :max="9999" class="w-full" />
          </el-form-item>
        </div>
        <el-form-item label="标题" required>
          <el-input v-model="pinnedForm.title" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="正文" required>
          <el-input v-model="pinnedForm.content" type="textarea" :rows="7" maxlength="10000" show-word-limit />
        </el-form-item>
        <el-form-item label="配图">
          <div>
            <el-upload
              v-model:file-list="pinnedFiles"
              multiple
              list-type="picture-card"
              :action="uploadUrl"
              :headers="uploadHeaders"
              accept=".png,.jpg,.jpeg,.webp"
              :limit="9"
              :before-upload="beforePinnedUpload"
              :on-success="pinnedUploadSuccess"
              :on-error="pinnedUploadError"
              :on-preview="previewPinnedImage"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <div class="mt-1 text-xs text-gray-400">最多 9 张，单张不超过 10MB；数据库只保存 OSS ID。</div>
          </div>
        </el-form-item>
        <div class="grid grid-cols-1 gap-x-5 md:grid-cols-2">
          <el-form-item label="发布状态">
            <el-radio-group v-model="pinnedForm.publishStatus">
              <el-radio value="published">发布</el-radio>
              <el-radio value="hidden">隐藏</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="pinnedForm.kind === 'activity'" label="活动状态">
            <el-radio-group v-model="pinnedForm.activityStatus">
              <el-radio value="active">进行中</el-radio>
              <el-radio value="ended">已结束</el-radio>
            </el-radio-group>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="pinnedItemDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="pinnedItemDialog.saving" :disabled="pinnedUploading" @click="savePinnedItem"> 保存 </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="imagePreview.visible" title="图片预览" width="800px" append-to-body>
      <img :src="imagePreview.url" class="mx-auto block max-h-[70vh] max-w-full" />
    </el-dialog>

    <el-dialog v-model="topicDialog.visible" title="编辑话题" width="520px">
      <el-form :model="topicForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="topicForm.name" maxlength="40" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="topicForm.description" type="textarea" :rows="4" maxlength="300" show-word-limit />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="topicForm.status">
            <el-radio v-for="option in contentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="topicDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveTopic">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="DalanbookManage" lang="ts">
import {
  addCircle,
  addPinnedItem,
  deleteCircle,
  deletePinnedItem,
  getCircle,
  listCircleUserOptions,
  listManagedContent,
  listPinnedItems,
  updateCircle,
  updateManagedContentStatus,
  updatePinnedItem,
  updateTopic
} from '@/api/dalanbook/manage';
import {
  CircleForm,
  CircleListItem,
  CircleStatus,
  ContentStatus,
  DalanbookManageQuery,
  DalanbookManageRow,
  DalanbookManageType,
  OssUploadResult,
  PinnedItem,
  PinnedItemForm,
  PinnedItemKind,
  TopicListItem,
  UserOption
} from '@/api/dalanbook/manage/types';
import { globalHeaders } from '@/utils/request';
import type { UploadFile, UploadFiles, UploadRawFile, UploadUserFile } from 'element-plus';

interface PinnedUploadFile extends UploadUserFile {
  ossId?: string;
}

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const route = useRoute();
const contentType = computed<DalanbookManageType>(() => {
  if (route.path.includes('/circles')) return 'circles';
  if (route.path.includes('/topics')) return 'topics';
  return 'posts';
});

const pageMetas = {
  posts: { title: '帖子管理', keywordLabel: '标题/内容' },
  circles: { title: '圈子管理', keywordLabel: '名称/简介' },
  topics: { title: '话题管理', keywordLabel: '名称/说明' }
};
const pageMeta = computed(() => pageMetas[contentType.value]);
const contentStatusOptions = [
  { label: '已发布', value: 'published' },
  { label: '已隐藏', value: 'hidden' },
  { label: '已删除', value: 'deleted' }
] as const;
const circleStatusOptions = [
  { label: '正常', value: 'published' },
  { label: '隐藏', value: 'hidden' },
  { label: '冻结', value: 'frozen' },
  { label: '已删除', value: 'deleted' }
] as const;
const statusOptions = computed(() => (contentType.value === 'circles' ? circleStatusOptions : contentStatusOptions));
const circleCategories = ['职场成长', 'AI 工具', '健身运动', '数码装备', '男士生活', '户外兴趣', '阅读写作'];
const circleTags = ['AI', '效率', '自动化', '职场', '复盘', '训练', '饮食', '桌搭', '评测', '阅读', '写作'];
const pinnedKindOptions = [
  { label: '圈子公约', value: 'rules' },
  { label: '公告', value: 'announcement' },
  { label: '活动', value: 'activity' }
] as const;

const loading = ref(false);
const rows = ref<DalanbookManageRow[]>([]);
const total = ref(0);
const queryFormRef = ref<ElFormInstance>();
const queryParams = reactive<DalanbookManageQuery>({ pageNum: 1, pageSize: 10, keyword: '', status: '' });

const initialCircleForm = (): CircleForm => ({
  id: undefined,
  ownerId: undefined,
  name: '',
  cover: '',
  description: '',
  category: '',
  tags: [],
  adminIds: [],
  recommendWeight: 0,
  homeVisible: false,
  sortOrder: 0,
  status: 'published'
});
const circleDialog = reactive({ visible: false, saving: false });
const circleForm = reactive<CircleForm>(initialCircleForm());
const coverPreview = ref('');
const coverUploading = ref(false);
const uploadUrl = `${import.meta.env.VITE_APP_BASE_API}/resource/oss/upload`;
const uploadHeaders = globalHeaders();
const userOptions = ref<UserOption[]>([]);
const usersLoading = ref(false);

const pinnedDialog = reactive({ visible: false, loading: false, circleId: '', circleName: '' });
const pinnedItemDialog = reactive({ visible: false, saving: false });
const pinnedItems = ref<PinnedItem[]>([]);
const initialPinnedForm = (): PinnedItemForm => ({
  id: '',
  kind: 'announcement',
  title: '',
  content: '',
  imageOssIds: [],
  activityStatus: null,
  sortOrder: 0,
  publishStatus: 'published'
});
const pinnedForm = reactive<PinnedItemForm>(initialPinnedForm());
const pinnedFiles = ref<PinnedUploadFile[]>([]);
const pinnedUploading = computed(() => pinnedFiles.value.some((file) => file.status === 'uploading'));
const imagePreview = reactive({ visible: false, url: '' });

const topicDialog = reactive({ visible: false });
const topicForm = reactive<Pick<TopicListItem, 'id' | 'name' | 'description' | 'status'>>({
  id: '',
  name: '',
  description: '',
  status: 'published'
});

const loadList = async () => {
  loading.value = true;
  try {
    const response = await listManagedContent(contentType.value, queryParams);
    rows.value = response.rows;
    total.value = response.total;
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => {
  queryParams.pageNum = 1;
  loadList();
};

const resetQuery = () => {
  queryParams.keyword = '';
  queryParams.status = '';
  queryFormRef.value?.resetFields();
  handleQuery();
};

const statusLabel = (status: string) => [...circleStatusOptions, ...contentStatusOptions].find((item) => item.value === status)?.label ?? status;
const statusTagType = (status: string) => (status === 'published' ? 'success' : status === 'hidden' || status === 'frozen' ? 'warning' : 'danger');
const visibilityLabel = (visibility: string) => (visibility === 'circle' ? '圈内可见' : visibility === 'public' ? '公开' : visibility);
const parseTags = (tags: string | string[]) => {
  if (Array.isArray(tags)) return tags;
  try {
    return JSON.parse(tags || '[]') as string[];
  } catch {
    return [];
  }
};

const changeStatus = async (row: DalanbookManageRow, status: string) => {
  await ElMessageBox.confirm(`确定将“${'title' in row ? row.title : row.name}”设为${statusLabel(status)}吗？`, '状态确认');
  await updateManagedContentStatus(contentType.value, row.id, status);
  ElMessage.success('状态已更新');
  await loadList();
};

const loadUserOptions = async (keyword = '') => {
  usersLoading.value = true;
  try {
    const response = await listCircleUserOptions(keyword);
    const selectedIds = new Set([circleForm.ownerId, ...circleForm.adminIds]);
    const selected = userOptions.value.filter((user) => selectedIds.has(user.userId));
    userOptions.value = [...selected, ...response.data.filter((user) => !selectedIds.has(user.userId))];
  } finally {
    usersLoading.value = false;
  }
};

const userOptionLabel = (user: UserOption) => `${user.nickName || user.userName}（${user.userName} / ${user.userId}）`;

const openCircleDialog = async (row?: CircleListItem) => {
  Object.assign(circleForm, initialCircleForm());
  coverPreview.value = '';
  await loadUserOptions();
  if (row) {
    const response = await getCircle(row.id);
    const { coverUrl, ...detail } = response.data;
    Object.assign(circleForm, detail, { tags: parseTags(detail.tags) });
    coverPreview.value = coverUrl || (/^(https?:\/\/|\/)/.test(detail.cover) ? detail.cover : '');
    await loadUserOptions();
  }
  circleDialog.visible = true;
};

const beforeCoverUpload = (file: UploadRawFile) => {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件');
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('圈子封面不能超过 5MB');
    return false;
  }
  coverUploading.value = true;
  return true;
};

const coverUploadSuccess = (response: OssUploadResult) => {
  coverUploading.value = false;
  if (response.code !== 200 || !response.data?.ossId) {
    ElMessage.error(response.msg || '圈子封面上传失败');
    return;
  }
  circleForm.cover = String(response.data.ossId);
  coverPreview.value = response.data.url;
  ElMessage.success('圈子封面已上传，保存后生效');
};

const coverUploadError = () => {
  coverUploading.value = false;
  ElMessage.error('圈子封面上传失败');
};

const saveCircle = async () => {
  if (!circleForm.name.trim()) return ElMessage.warning('圈子名称不能为空');
  if (!circleForm.description.trim()) return ElMessage.warning('圈子简介不能为空');
  if (!circleForm.category.trim()) return ElMessage.warning('圈子分类不能为空');
  if (!circleForm.ownerId) return ElMessage.warning('请选择圈主');
  const { id, ...payload } = circleForm;
  circleDialog.saving = true;
  try {
    if (id) await updateCircle(id, payload);
    else await addCircle(payload);
    circleDialog.visible = false;
    ElMessage.success(id ? '圈子信息已保存' : '圈子已创建');
    await loadList();
  } finally {
    circleDialog.saving = false;
  }
};

const removeCircle = async (row: CircleListItem) => {
  await ElMessageBox.confirm(`确定逻辑删除圈子“${row.name}”吗？历史内容和审计记录会保留。`, '删除确认', { type: 'warning' });
  await deleteCircle(row.id);
  ElMessage.success('圈子已删除');
  await loadList();
};

const loadPinnedItems = async () => {
  pinnedDialog.loading = true;
  try {
    const response = await listPinnedItems(pinnedDialog.circleId);
    pinnedItems.value = response.data;
  } finally {
    pinnedDialog.loading = false;
  }
};

const openPinnedDialog = async (row: CircleListItem) => {
  pinnedDialog.circleId = row.id;
  pinnedDialog.circleName = row.name;
  pinnedDialog.visible = true;
  await loadPinnedItems();
};

const pinnedKindLabel = (kind: PinnedItemKind) => pinnedKindOptions.find((item) => item.value === kind)?.label ?? kind;

const openPinnedItemDialog = (item?: PinnedItem) => {
  Object.assign(pinnedForm, initialPinnedForm());
  pinnedFiles.value = [];
  if (item) {
    Object.assign(pinnedForm, {
      id: item.id,
      kind: item.kind,
      title: item.title,
      content: item.content,
      imageOssIds: item.images.map((image) => image.ossId),
      activityStatus: item.activityStatus || null,
      sortOrder: item.sortOrder,
      publishStatus: item.publishStatus
    });
    pinnedFiles.value = item.images.map((image) => ({
      name: image.ossId,
      url: image.url,
      ossId: image.ossId,
      status: 'success'
    }));
  }
  pinnedItemDialog.visible = true;
};

const beforePinnedUpload = (file: UploadRawFile) => {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件');
    return false;
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('单张图片不能超过 10MB');
    return false;
  }
  return true;
};

const pinnedUploadSuccess = (response: OssUploadResult, uploadFile: UploadFile) => {
  if (response.code !== 200 || !response.data?.ossId) {
    ElMessage.error(response.msg || '图片上传失败');
    pinnedFiles.value = pinnedFiles.value.filter((file) => file.uid !== uploadFile.uid);
    return;
  }
  const file = pinnedFiles.value.find((item) => item.uid === uploadFile.uid);
  if (file) {
    file.ossId = String(response.data.ossId);
    file.url = response.data.url;
  }
};

const pinnedUploadError = (_error: Error, uploadFile: UploadFile, _uploadFiles: UploadFiles) => {
  pinnedFiles.value = pinnedFiles.value.filter((file) => file.uid !== uploadFile.uid);
  ElMessage.error('图片上传失败');
};

const previewPinnedImage = (file: UploadFile) => {
  imagePreview.url = file.url || '';
  imagePreview.visible = true;
};

const savePinnedItem = async () => {
  if (!pinnedForm.title.trim()) return ElMessage.warning('标题不能为空');
  if (!pinnedForm.content.trim()) return ElMessage.warning('正文不能为空');
  if (pinnedUploading.value) return ElMessage.warning('请等待图片上传完成');
  const imageOssIds = pinnedFiles.value.map((file) => String(file.ossId || '')).filter(Boolean);
  const payload = {
    kind: pinnedForm.kind,
    title: pinnedForm.title.trim(),
    content: pinnedForm.content.trim(),
    imageOssIds,
    activityStatus: pinnedForm.kind === 'activity' ? pinnedForm.activityStatus || 'active' : null,
    sortOrder: pinnedForm.sortOrder,
    publishStatus: pinnedForm.publishStatus
  };
  pinnedItemDialog.saving = true;
  try {
    if (pinnedForm.id) await updatePinnedItem(pinnedDialog.circleId, pinnedForm.id, payload);
    else await addPinnedItem(pinnedDialog.circleId, payload);
    pinnedItemDialog.visible = false;
    ElMessage.success(pinnedForm.id ? '置顶消息已更新' : '置顶消息已新增');
    await loadPinnedItems();
  } finally {
    pinnedItemDialog.saving = false;
  }
};

const removePinnedItem = async (item: PinnedItem) => {
  await ElMessageBox.confirm(`确定删除置顶消息“${item.title}”吗？`, '删除确认', { type: 'warning' });
  await deletePinnedItem(pinnedDialog.circleId, item.id);
  ElMessage.success('置顶消息已删除');
  await loadPinnedItems();
};

const openTopicDialog = (row: TopicListItem) => {
  Object.assign(topicForm, row);
  topicDialog.visible = true;
};

const saveTopic = async () => {
  if (!topicForm.name.trim()) return ElMessage.warning('话题名称不能为空');
  await updateTopic(topicForm.id, topicForm);
  topicDialog.visible = false;
  ElMessage.success('话题已保存');
  await loadList();
};

watch(contentType, () => {
  queryParams.pageNum = 1;
  loadList();
});

loadList();
</script>
