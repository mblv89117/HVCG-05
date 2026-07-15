# scrDataRooms — Secure Data Rooms admin

**Datasources:** DataRooms, DataRoomParticipants, Clients

## Layout

1. Rooms gallery — Status, RoomType, ExternalSharingMode, ExternalAccessAllowed
2. Create from template → `HVCG_DataRoomProvisionStub`
3. Participants planner — Planned only; InviteSent locked false
4. Security strip — “External sharing: Disabled”

## Forbidden UI actions

Send invite · anonymous link · org sharing flip · InviteSent=true
