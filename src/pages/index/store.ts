import { ref } from 'vue';
import { groupType, groupNameKey } from './types';

// export const curTab = ref(groupType.My);

export const groupItems = ref([
  {
    name: groupType.My,
    titleKey: groupNameKey[groupType.My]
  },
  {
    name: groupType.Others,
    titleKey: groupNameKey[groupType.Others]
  }
]);

export const collapsedGroup = ref([groupType.My]);
