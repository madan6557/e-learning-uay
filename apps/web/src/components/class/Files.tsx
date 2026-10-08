import {
  t,
  api,
  useApi,
  Loading,
  Notice,
  Empty,
  Badge,
  Action,
  Pagination,
  usePagination,
  date,
} from "../../lib";
import { confirmAction } from "../../confirm";

export function Files({ classId, writable }: { classId: string; writable: boolean }) {
  const files = useApi<any[]>(`/course-classes/${classId}/files`);
  const pagination = usePagination(files.data ?? [], 15);

  return (
    <>
      <div className="section-heading">
        <div>
          <h2>{t.files}</h2>
          <p>{t.fileRetention}</p>
        </div>
      </div>
      {files.error ? (
        <Notice error={files.error} />
      ) : files.loading && !files.data ? (
        <Loading />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.filename}</th>
                <th>{t.fileStatus}</th>
                <th>{t.timestamp}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pagination.paginatedItems.map((file) => (
                <tr key={file.id}>
                  <td>
                    {file.name}
                    <small className="block">
                      {(file.sizeBytes / 1024).toFixed(1)} KB
                    </small>
                  </td>
                  <td>
                    <Badge value={file.status} />
                  </td>
                  <td>{date(file.createdAt)}</td>
                  <td>
                    {writable && ["READY", "TRASH"].includes(file.status) && (
                      <Action
                        run={async () => {
                          if (
                            file.status === "READY" &&
                            !(await confirmAction(t.confirmTrash))
                          )
                            return;
                          await api(
                            `/files/${file.id}/${file.status === "TRASH" ? "restore" : "trash"}`,
                            "POST",
                            {},
                          );
                          files.reload();
                        }}
                      >
                        {file.status === "TRASH" ? t.restore : t.trash}
                      </Action>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {files.data && files.data.length > 0 && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              pageSizeOptions={[10, 15, 25, 50]}
            />
          )}
          {!files.data?.length && <Empty>{t.noFiles}</Empty>}
        </div>
      )}
    </>
  );
}
