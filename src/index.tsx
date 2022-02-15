import { ActionPanel, Detail, List, Action, getPreferenceValues, Icon } from "@raycast/api";
import { Octokit } from "@octokit/rest";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

type File = {
  name: string;
  path: string;
  sha: string;
  url: string;
  git_url: string;
  html_url: string;
};

const Preview = ({ file }: { file: File }) => {
  const [content, setContent] = useState<string>();
  useEffect(() => {
    (async () => {
      const token = getPreferenceValues().token;
      const octokit = new Octokit({ auth: token });
      const res = await octokit.request({ url: file.git_url });
      const decoded = Buffer.from(res.data.content, "base64").toString();
      setContent(decoded);
    })();
  }, []);

  return (
    <Detail
      markdown={content}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={file.html_url} />
        </ActionPanel>
      }
    />
  );
};

const useFiles = (q: string | undefined): { files: File[]; isLoading: boolean } => {
  if (q === undefined) {
    return { files: [], isLoading: true };
  }
  const [state, setState] = useState<File[] | undefined>(undefined);
  useEffect(() => {
    (async () => {
      setState(undefined);
      const token = getPreferenceValues().token;
      const octokit = new Octokit({ auth: token });
      const res = await octokit.rest.search.code({ q: `repo:wantedly/dev language:Markdown ${q}` });
      setState(res.data.items);
    })();
  }, [q]);
  if (state !== undefined) {
    return { files: state, isLoading: false };
  }
  return { files: [], isLoading: true };
};

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [debouncedSearchText] = useDebounce(searchText, 200);
  const { files, isLoading: isLoadingFiles } = useFiles(debouncedSearchText);
  const items = files?.map((f) => {
    return (
      <List.Item
        icon={Icon.Finder}
        title={f.path}
        key={f.git_url}
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<Preview file={f} />} />
            <Action.OpenInBrowser url={f.html_url} />
          </ActionPanel>
        }
      />
    );
  });

  const isLoading = searchText !== debouncedSearchText || isLoadingFiles;

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder={searchText}>
      {items}
    </List>
  );
}
